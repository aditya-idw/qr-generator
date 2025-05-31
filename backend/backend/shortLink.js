// backend/backend/shortLink.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const knex = require('../../db');                  // ← now points up two levels to backend/db.js
const auth = require('../../middleware/auth');     // ← up two levels to middleware/auth.js
const { requireRole } = require('../../middleware/permissions'); // ← permissions.js

const router = express.Router();

/**
 * POST /short-link
 * Body: { url: string, customKey?: string }
 * Creates a dynamic QR redirect (i.e. short link) and returns the key.
 */
router.post(
  '/short-link',
  auth,
  requireRole('user'),
  async (req, res) => {
    const { url, customKey } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Missing url in request body' });
    }

    let key = customKey && customKey.trim();
    if (key) {
      // Validate custom key: alphanumeric, dashes/underscores, 3–64 chars
      const valid = /^[A-Za-z0-9_-]{3,64}$/.test(key);
      if (!valid) {
        return res.status(400).json({
          error:
            'Custom key must be 3–64 characters: letters, numbers, dash or underscore.',
        });
      }
      // Ensure uniqueness
      const exists = await knex('DynamicQR').where({ id: key }).first();
      if (exists) {
        return res.status(409).json({ error: 'Custom key already in use' });
      }
    } else {
      // Generate a random 8-character key
      key = uuidv4().slice(0, 8);
    }

    // Insert into DynamicQR table
    await knex('DynamicQR').insert({
      id: key,
      url,
      hits: 0,
      created: knex.fn.now(),
      // Other fields (expiry, clickCap, rateLimit, etc.) remain null by default
    });

    return res.status(201).json({ key });
  }
);

module.exports = router;
