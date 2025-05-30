// index.js
require('dotenv').config();

const express = require('express');
const { buildPayload } = require('./backend/qrService');
const redirectHandler = require('./backend/redirect');
const userRoutes = require('./backend/users');
const auth = require('./middleware/auth');

const app = express();

// Parse JSON bodies on all routes
app.use(express.json({ limit: '1mb' }));

// Mount user registration & login routes
app.use(userRoutes);

/**
 * Handler for QR generation.
 * Supports both GET (query params) and POST (JSON body).
 */
async function handleGenerateQr(req, res) {
  const source = Object.keys(req.query).length ? req.query : (req.body || {});
  const { payloadType, payloadData, format = 'svg' } = source;

  if (!payloadType || !payloadData) {
    return res
      .status(400)
      .json({ error: 'Missing payloadType or payloadData parameters' });
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
    // Fallback to plain text
    return res.type('text/plain').send(output);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

// Public GET endpoint for QR generation
app.get('/generateQr', handleGenerateQr);

// Protected POST endpoint for QR generation (requires valid JWT)
app.post('/generateQr', auth, handleGenerateQr);

// Dynamic redirect endpoint
app.get('/r/:key', redirectHandler);

// Start the server if this file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 Listening on port ${PORT}`));
}

module.exports = app;
