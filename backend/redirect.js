const knexConfig = require('../knexfile').development;
const knex = require('knex')(knexConfig);

module.exports = async function redirectHandler(req, res) {
  const { key } = req.params;

  // Lookup the dynamic QR record
  const record = await knex('DynamicQR').where({ id: key }).first();
  if (!record) {
    return res.status(404).json({ error: 'QR code not found' });
  }

  const now = new Date();

  // Enforce expiry
  if (record.expiry && new Date(record.expiry) < now) {
    return res.status(410).json({ error: 'QR code has expired' });
  }

  // Enforce click cap
  if (record.clickCap != null && record.hits >= record.clickCap) {
    return res.status(403).json({ error: 'Click cap reached' });
  }

  // TODO: add other rule checks (rateLimit, geoFence, etc.)

  // Increment hits
  await knex('DynamicQR').where({ id: key }).increment('hits', 1);

  // Redirect to the target URL
  return res.redirect(record.url);
};
