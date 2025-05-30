// index.js
require('dotenv').config();

const express = require('express');
const { buildPayload } = require('./backend/qrService');
const redirectHandler = require('./backend/redirect');
const userRoutes = require('./backend/users');
const apiKeyRoutes = require('./backend/apiKeys');
const auth = require('./middleware/auth');
const apiKeyAuth = require('./middleware/apiKeyAuth');
const { requireRole } = require('./middleware/permissions');

const app = express();

// Parse JSON bodies on all routes
app.use(express.json({ limit: '1mb' }));

// Mount user registration & login routes
app.use(userRoutes);

// Mount API-key management routes
app.use(apiKeyRoutes);

/**
 * Shared handler for QR generation.
 */
async function handleGenerateQr(req, res) {
  const source = Object.keys(req.query).length
    ? req.query
    : req.body || {};
  const { payloadType, payloadData, format = 'svg' } = source;

  if (!payloadType || !payloadData) {
    return res
      .status(400)
      .json({ error: 'Missing payloadType or payloadData parameters' });
  }

  try {
    const output = await buildPayload({ payloadType, payloadData, format });

    if (format === 'svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(output);
    }
    if (format === 'png') {
      return res.type('image/png').send(output);
    }
    if (format === 'jpg' || format === 'jpeg') {
      return res.type('image/jpeg').send(output);
    }
    // Fallback
    return res.type('text/plain').send(output);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

// Public GET endpoint for QR generation
app.get('/generateQr', handleGenerateQr);

// Public POST endpoint for QR generation (for your React front-end)
app.post('/generateQr', handleGenerateQr);

// Protected POST endpoint for QR generation (JWT or API-key clients)
app.post(
  '/generateQr/auth',
  (req, res, next) =>
    req.get('x-api-key')
      ? apiKeyAuth(req, res, next)
      : auth(req, res, next),
  requireRole('user'),
  handleGenerateQr
);

// Dynamic redirect endpoint
app.get('/r/:key', redirectHandler);

// Start the server if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 Listening on port ${PORT}`));
}

module.exports = app;
