// middleware/apiKeyAuth.js
const knex = require('../backend/db');
const redis = require('../backend/cache');

module.exports = async function apiKeyAuth(req, res, next) {
  const key = req.get('x-api-key');
  if (!key) {
    return res.status(401).json({ error: 'API key required' });
  }

  // Look up the key and ensure it’s active
  const record = await knex('ApiKeys')
    .where({ key, revoked: false })
    .first();

  if (!record) {
    return res.status(401).json({ error: 'Invalid or revoked API key' });
  }

  // Load the user and their roles
  const user = await knex('Users')
    .where({ userId: record.userId })
    .first();

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  // Attach a minimal req.user object
  req.user = {
    userId: user.userId,
    email: user.email,
    roles: user.roles || []  // ensure roles column exists on Users
  };

  next();
};
