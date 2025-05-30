// index.js
require('dotenv').config();

const express = require('express');
const { buildPayload } = require('./backend/qrService');
const redirectHandler = require('./backend/redirect');
const userRoutes = require('./backend/users');
const auth = require('./middleware/auth');
const { requireRole } = require('./middleware/permissions');

const app = express();

// JSON parser
app.use(express.json({ limit: '1mb' }));

// User registration & login (public)
app.use(userRoutes);

// QR generation handlers
async function handleGenerateQr(req, res) {
  const source = Object.keys(req.query).length ? req.query : (req.body || {});
  const { payloadType, payloadData, format = 'svg' } = source;
  if (!payloadType || !payloadData) {
    return res.status(400).json({ error: 'Missing payloadType or payloadData' });
  }
  try {
    const output = await buildPayload({ payloadType, payloadData, format });
    if (format === 'svg') {
      res.setHeader('Content-Type', 'text/svg+xml');
      return res.send(output);
    }
    if (format === 'png') {
      return res.type('image/png').send(output);
    }
    if (format === 'jpg' || format === 'jpeg') {
      return res.type('image/jpeg').send(output);
    }
    return res.type('text/plain').send(output);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

// Public GET endpoint
app.get('/generateQr', handleGenerateQr);

// Protected POST endpoint (must be authenticated and have the "user" role)
app.post(
  '/generateQr',
  auth,
  requireRole('user'),
  handleGenerateQr
);

// Dynamic redirects (no auth, normally)
app.get('/r/:key', redirectHandler);

// Example admin-only route: list all users (requires "admin" role)
app.get(
  '/admin/users',
  auth,
  requireRole('admin'),
  async (req, res) => {
    const users = await require('./backend/usersModel').listAll();
    res.json(users);
  }
);

// Start server
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 Listening on port ${PORT}`));
}

module.exports = app;
