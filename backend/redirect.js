// backend/redirect.js
const knexConfig = require('../knexfile').development;
const knex = require('knex')(knexConfig);

// In-memory store for timestamps: { "<key>:<ip>": [timestamp, ...] }
const rateWindows = new Map();

module.exports = async function redirectHandler(req, res) {
  const { key } = req.params;
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  // Lookup the dynamic QR record
  const record = await knex('DynamicQR').where({ id: key }).first();
  if (!record) {
    return res.status(404).json({ error: 'QR code not found' });
  }

  // 1) Expiry check
  if (record.expiry && new Date(record.expiry) < now) {
    return res.status(410).json({ error: 'QR code has expired' });
  }

  // 2) Click cap enforcement
  if (record.clickCap != null && record.hits >= record.clickCap) {
    return res.status(403).json({ error: 'Click cap reached' });
  }

  // 3) Rate limiting
  if (record.rateLimit) {
    const { count, perMilliseconds } = record.rateLimit;
    const windowKey = `${key}:${ip}`;
    const timestamps = rateWindows.get(windowKey) || [];

    // Filter out timestamps outside the sliding window
    const windowStart = now - perMilliseconds;
    const recent = timestamps.filter(ts => ts > windowStart);

    if (recent.length >= count) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // Record this hit
    recent.push(now);
    rateWindows.set(windowKey, recent);
  }

  // 4) Geo-fence redirection
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
    if (!targetUrl) {
      return res.status(403).json({ error: 'Region not allowed' });
    }
    record.url = targetUrl;
  }

  // 5) Password protection (TODO)
  if (record.passwordProtected) {
    // …
  }

  // 6) Device/User-Agent routing
  if (record.deviceRouting) {
    const ua = req.get('User-Agent') || '';
    const isMobile = /Mobi|Android/i.test(ua);
    record.url = isMobile
      ? record.deviceRouting.mobileUrl || record.url
      : record.deviceRouting.desktopUrl || record.url;
  }

  // 7) Time-of-day / Day-of-week routing
  if (record.timeRouting) {
    const date = new Date();
    const day = date.getDay(); // 0=Sun … 6=Sat
    const hr = date.getHours();
    const tr = record.timeRouting;

    if ((day === 0 || day === 6) && tr.weekendsUrl) {
      record.url = tr.weekendsUrl;
    } else if (hr >= 9 && hr < 17 && tr.businessHoursUrl) {
      record.url = tr.businessHoursUrl;
    } else if (tr.afterHoursUrl) {
      record.url = tr.afterHoursUrl;
    }
  }

  // 8) Analytics webhook (TODO)
  if (record.webhookUrl) {
    // …
  }

  // Increment hits
  await knex('DynamicQR').where({ id: key }).increment('hits', 1);

  // Final redirect
  return res.redirect(record.url);
};
