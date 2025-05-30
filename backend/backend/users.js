// backend/users.js
require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const knexConfig = require('../knexfile').development;
const knex = require('./db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// Helper: generate JWT
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// POST /users — registration
router.post('/users', async (req, res) => {
  const { email, password, displayName, locale, timezone } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  // Check uniqueness
  const exists = await knex('Users').where({ email }).first();
  if (exists) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // Hash password
  const hashed = await bcrypt.hash(password, 12);
  const userId = uuidv4();

  await knex('Users').insert({
    userId,
    email,
    password: hashed,
    displayName: displayName || null,
    locale: locale || 'en-US',
    timezone: timezone || 'UTC',
    created: knex.fn.now()
  });

  const token = signToken({ userId, email });
  res.status(201).json({ userId, email, token });
});

// POST /auth/login — login
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = await knex('Users').where({ email }).first();
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    // increment failedLoginCount
    await knex('Users')
      .where({ userId: user.userId })
      .increment('failedLoginCount', 1)
      .update({ lastFailedLogin: knex.fn.now() });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Successful login: reset counters, set lastLogin
  await knex('Users')
    .where({ userId: user.userId })
    .update({
      failedLoginCount: 0,
      lastLogin: knex.fn.now()
    });

  const token = signToken({ userId: user.userId, email });
  res.json({ userId: user.userId, email, token });
});

module.exports = router;
