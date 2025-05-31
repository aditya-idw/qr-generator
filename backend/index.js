// backend/index.js
require('dotenv').config();

const express          = require('express');
const { buildPayload } = require('./services/qrService');
const redirectHandler  = require('./services/redirect');
const userRoutes       = require('./services/users');
const apiKeyRoutes     = require('./services/apiKeys');
const shortLinkRoutes  = require('./services/shortLink');
const auth             = require('./middleware/auth');
const apiKeyAuth       = require('./middleware/apiKeyAuth');
const { requireRole }  = require('./middleware/permissions');

const app = express();

// ──────────────────────────────────────────────────────────────────────────────
// 1. Parse JSON bodies on all routes
// ──────────────────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ──────────────────────────────────────────────────────────────────────────────
// 2. Mount “service” routers
//    - userRoutes exposes signup/login endpoints
//    - apiKeyRoutes handles API‐key CRUD
//    - shortLinkRoutes handles POST /short-link
// ──────────────────────────────────────────────────────────────────────────────
app.use(userRoutes);
app.use(apiKeyRoutes);
app.use(shortLinkRoutes);

/**
 * 3. Shared handler for /generateQr (GET or POST)
 *
 *    - Reads either req.query or req.body for:
 *        { payloadType, payloadData, format }
 *    - Invokes buildPayload() from ./services/qrService
 *    - Returns SVG/PNG/JPEG with appropriate Content-Type
 */
async function handleGenerateQr(req, res) {
  // Decide whether the client sent JSON in query string vs. request body
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
    // Fallback: send plain text if format isn’t recognized
    return res.type('text/plain').send(output);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 4. Public QR‐generation endpoints
//    - GET  /generateQr  (can be invoked via query string)
//    - POST /generateQr  (can be invoked via JSON body, for React forms)
// ──────────────────────────────────────────────────────────────────────────────
app.get('/generateQr', handleGenerateQr);
app.post('/generateQr', handleGenerateQr);

// ──────────────────────────────────────────────────────────────────────────────
// 5. Protected QR‐generation endpoint with API‐key or JWT auth
//    - POST /generateQr/auth
//    - If X-API-Key header is set, run apiKeyAuth middleware
//    - Otherwise run JWT‐based auth middleware
//    - Then enforce `requireRole('user')`, then call handleGenerateQr()
// ──────────────────────────────────────────────────────────────────────────────
app.post(
  '/generateQr/auth',
  (req, res, next) =>
    req.get('x-api-key')
      ? apiKeyAuth(req, res, next)
      : auth(req, res, next),
  requireRole('user'),
  handleGenerateQr
);

// ──────────────────────────────────────────────────────────────────────────────
// 6. Dynamic redirect endpoint
//    GET /r/:key
//    - Looks up the key in your DynamicQR table, enforces any dynamic rules,
//      increments hits, then either 302→redirect or 4xx error.
// ──────────────────────────────────────────────────────────────────────────────
app.get('/r/:key', redirectHandler);

// ──────────────────────────────────────────────────────────────────────────────
// 7. Start server if run “node index.js” directly
//    Defaults to port 5000 (or process.env.PORT)
// ──────────────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Listening on port ${PORT}`));
}

// 8. Export for testing
module.exports = app;
