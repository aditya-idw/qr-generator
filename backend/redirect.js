// backend/redirect.js
const knexConfig = require('../knexfile').development;
const knex = require('knex')(knexConfig);

module.exports = async function redirectHandler(req, res) {
  const { key } = req.params;
  const now = new Date();

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

  // 3) Rate limiting (TODO: implement proper windowed counter)
  if (record.rateLimit) {
    // Example placeholder: record.rateLimit = { count: N, perMilliseconds: M }
    // You need to track per-IP or globally how many times within window
    // For now, skip or add your own implementation here.
  }

  // 4) Geo-fence redirection
  if (record.geoFence) {
    // Expect a header 'x-region' with country code (e.g. "US","IN")
    const region = req.headers['x-region'];
    const gf = record.geoFence;
    let targetUrl;
    if (Array.isArray(gf.allowedRegions)) {
      // single redirect URL for allowed regions
      targetUrl = gf.allowedRegions.includes(region)
        ? record.url
        : gf.fallbackUrl;
    } else {
      // per-region URLs object
      targetUrl = gf.allowedRegions[region] || gf.fallbackUrl;
    }
    if (!targetUrl) {
      return res.status(403).json({ error: 'Region not allowed' });
    }
    record.url = targetUrl;
  }

  // 5) Password protection (TODO: implement prompt or token check)
  if (record.passwordProtected) {
    // e.g. read `req.query.pw` or req.headers['x-qr-password']
    // if incorrect, return 401 or redirect to an auth page
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
    const day = now.getDay(); // 0=Sun ... 6=Sat
    const hr = now.getHours();
    const tr = record.timeRouting;

    if ((day === 0 || day === 6) && tr.weekendsUrl) {
      record.url = tr.weekendsUrl;
    } else if (hr >= 9 && hr < 17 && tr.businessHoursUrl) {
      record.url = tr.businessHoursUrl;
    } else if (tr.afterHoursUrl) {
      record.url = tr.afterHoursUrl;
    }
  }

  // 8) Analytics webhook (TODO: fire async webhook before redirect)
  if (record.webhookUrl) {
    // e.g. fetch(record.webhookUrl, { method: 'POST', body: ... })
  }

  // Increment hits
  await knex('DynamicQR').where({ id: key }).increment('hits', 1);

  // Final redirect
  return res.redirect(record.url);
};
