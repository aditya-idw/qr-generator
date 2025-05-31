// backend/tests/qrService.test.js

const { buildPayload } = require('../services/qrService');

test('buildPayload generates valid SVG for URL', async () => {
  const svg = await buildPayload({
    payloadType: 'url',
    payloadData: 'https://idw.com',
    format: 'svg',
  });
  expect(svg.startsWith('<svg')).toBe(true);
});
