// index.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { buildPayload } = require('./backend/qrService');
const redirectHandler = require('./backend/redirect');

const app = express();
app.use(bodyParser.json({ limit: '1mb' }));

async function handleGenerateQr(req, res) {
  const source = Object.keys(req.query).length ? req.query : (req.body || {});
  const { payloadType, payloadData, format = 'svg' } = source;

  if (!payloadType || !payloadData) {
    return res.status(400).json({ error: 'Missing payloadType or payloadData parameters' });
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

app.get('/generateQr', handleGenerateQr);
app.post('/generateQr', handleGenerateQr);

// Dynamic redirect endpoint
app.get('/r/:key', redirectHandler);

// Only start listening when run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 Listening on port ${PORT}`));
}

module.exports = app;
