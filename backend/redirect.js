// backend/redirect.js
require('dotenv').config();
const knexConfig = require('../knexfile').development;
const knex = require('knex')(knexConfig);
const Redis = require('ioredis');
const { fetch } = require('undici');

// Test mode flag
const isTest = process.env.NODE_ENV === 'test';

// In-memory rate windows for test mode
const rateWindows = isTest ? new Map() : null;

// Initialize Redis client for distributed rate-limiting
const redis = !isTest ? new Redis(process.env.REDIS_URL) : null;

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
  if (record.expiry && new Date(record.expiry) < new Date(now)) {
    return res.status(410).json({ error: 'QR code has expired' });
  }

  // 2) Click cap enforcement
  if (record.clickCap != null && record.hits >= record.clickCap) {
    return res.status(403).json({ error: 'Click cap reached' });
  }

  // 3) Rate limiting (test vs production)
  if (record.rateLimit) {
    const { count, perMilliseconds } = record.rateLimit;
    if (isTest) {
      const windowKey = `${key}:${ip}`;
      // Clear previous test data when record is new
      if (record.hits === 0) {
        rateWindows.delete(windowKey);
      }
      // In-memory sliding window
      const timestamps = rateWindows.get(windowKey) || [];
      const windowStart = now - perMilliseconds;
      const recent = timestamps.filter(ts => ts > windowStart);
      if (recent.length >= count) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      recent.push(now);
      rateWindows.set(windowKey, recent);
    } else {
      // Redis-based sliding window
      const windowKey = `rate:${key}:${ip}`;
      const windowStart = now - perMilliseconds;
      await redis.zremrangebyscore(windowKey, 0, windowStart);
      const requests = await redis.zcard(windowKey);
      if (requests >= count) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }
      await redis.zadd(windowKey, now, now);
      await redis.pexpire(windowKey, perMilliseconds);
    }
  }

  // 4) Geo-fence redirection
  if (record.geoFence) {
    const region = req.headers['x-region'];
    const gf = record.geoFence;
    let targetUrl;
    if (Array.isArray(gf.allowedRegions)) {
      targetUrl = gf.allowedRegions.includes(region) ? record.url : gf.fallbackUrl;
    } else {
      targetUrl = gf.allowedRegions[region] || gf.fallbackUrl;
    }
    if (!targetUrl) {
      return res.status(403).json({ error: 'Region not allowed' });
    }
    record.url = targetUrl;
  }

  // 5) Password protection
  if (record.passwordProtected) {
    const provided = req.query.pw || req.headers['x-qr-password'];
    if (!provided || provided !== record.password) {
      return res.status(401).json({ error: 'Password required or incorrect' });
    }
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
    const day = date.getDay();
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

  // 8) Analytics webhook (skip in test)
  if (!isTest && record.webhookUrl) {
    fetch(record.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, ip, timestamp: now, userAgent: req.get('User-Agent') }),
    }).catch(err => console.error('Webhook error:', err));
  }

  // Increment hits
  await knex('DynamicQR').where({ id: key }).increment('hits', 1);

  // Final redirect
  return res.redirect(record.url);
};
