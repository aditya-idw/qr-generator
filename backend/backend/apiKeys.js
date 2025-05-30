// backend/apiKeys.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const knexConfig = require('../knexfile').development;
const knex = require('./db');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * POST /users/:id/api-keys
 * Create a new API key for the authenticated user.
 */
router.post(
  '/users/:id/api-keys',
  auth,
  async (req, res) => {
    const { id: userId } = req.params;
    if (req.user.userId !== userId && !req.user.roles.includes('admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const key = uuidv4().replace(/-/g, '');
    await knex('ApiKeys').insert({ userId, key });
    res.status(201).json({ key, created: new Date().toISOString() });
  }
);

/**
 * GET /users/:id/api-keys
 * List all non-revoked API keys for the user.
 */
router.get(
  '/users/:id/api-keys',
  auth,
  async (req, res) => {
    const { id: userId } = req.params;
    if (req.user.userId !== userId && !req.user.roles.includes('admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const keys = await knex('ApiKeys')
      .select('id', 'key', 'created')
      .where({ userId, revoked: false });
    res.json(keys);
  }
);

/**
 * DELETE /users/:id/api-keys/:keyId
 * Revoke an API key.
 */
router.delete(
  '/users/:id/api-keys/:keyId',
  auth,
  async (req, res) => {
    const { id: userId, keyId } = req.params;
    if (req.user.userId !== userId && !req.user.roles.includes('admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const updated = await knex('ApiKeys')
      .where({ id: keyId, userId })
      .update({ revoked: true, revokedAt: knex.fn.now() });
    if (!updated) {
      return res.status(404).json({ error: 'API key not found' });
    }
    res.status(204).send();
  }
);

module.exports = router;
