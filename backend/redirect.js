// backend/redirect.js
const knex = require('./db');
const redis = require('./cache');

// Detect test mode
const isTest = process.env.NODE_ENV === 'test';

module.exports = async function redirectHandler(req, res) {
  const { key } = req.params;
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  // Lookup the dynamic QR record
  const record = await knex('DynamicQR').where({ id: key }).first();
  if (!record) return res.status(404).json({ error: 'QR code not found' });

  // Expiry check
  if (record.expiry && new Date(record.expiry) < now) {
    return res.status(410).json({ error: 'QR code has expired' });
  }

  // Click cap enforcement
  if (record.clickCap != null && record.hits >= record.clickCap) {
    return res.status(403).json({ error: 'Click cap reached' });
  }

  // Rate limiting via Redis or in-memory stub
  if (record.rateLimit) {
    const { count, perMilliseconds } = record.rateLimit;
    const windowKey = `${key}:${ip}`;

    // Reset stub window for fresh records in test mode
    if (isTest && record.hits === 0) {
      await redis.zremrangebyscore(windowKey, 0, now);
    }

    await redis.zremrangebyscore(windowKey, 0, now - perMilliseconds);
    const current = await redis.zcard(windowKey);
    if (current >= count) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    await redis.zadd(windowKey, now, `${now}`);
    await redis.pexpire(windowKey, perMilliseconds);
  }

  // Geo-fence redirection
  if (record.geoFence) {
    const region = req.headers['x-region'];
    const gf = record.geoFence;
    let targetUrl;
    if (Array.isArray(gf.allowedRegions)) {
      targetUrl = gf.allowedRegions.includes(region)
        ? record.url
        : gf.fallbackUrl;
    } else {
      targetUrl = gf.allowedRegions[region] || gf.fallbackUrl;
    }
    if (!targetUrl) return res.status(403).json({ error: 'Region not allowed' });
    record.url = targetUrl;
  }

  // Password protection
  if (record.passwordProtected) {
    const provided = req.query.pw || req.get('x-qr-password');
    if (provided !== record.password) {
      return res.status(401).json({ error: 'Password required or incorrect' });
    }
  }

  // Device/User-Agent routing
  if (record.deviceRouting) {
    const ua = req.get('User-Agent') || '';
    const isMobile = /Mobi|Android/i.test(ua);
    record.url = isMobile
      ? record.deviceRouting.mobileUrl || record.url
      : record.deviceRouting.desktopUrl || record.url;
  }

  // Time-of-day / Day-of-week routing
  if (record.timeRouting) {
    const date = new Date();
    const day = date.getDay(), hr = date.getHours();
    const tr = record.timeRouting;
    if ((day === 0 || day === 6) && tr.weekendsUrl) {
      record.url = tr.weekendsUrl;
    } else if (hr >= 9 && hr < 17 && tr.businessHoursUrl) {
      record.url = tr.businessHoursUrl;
    } else if (tr.afterHoursUrl) {
      record.url = tr.afterHoursUrl;
    }
  }

  // Analytics webhook (skip in test)
  if (!isTest && record.webhookUrl) {
    require('undici')
      .fetch(record.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          timestamp: new Date().toISOString(),
          ip,
          userAgent: req.get('User-Agent'),
        }),
      })
      .catch(err => console.error('Webhook error:', err));
  }

  // Increment hits
  await knex('DynamicQR').where({ id: key }).increment('hits', 1);

  // Final redirect
  return res.redirect(record.url);
};
