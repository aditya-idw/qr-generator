// backend/qrService.js
const QRCode = require('qrcode');
const Jimp   = require('jimp');

/**
 * buildPayload
 * @param {Object} opts
 * @param {'url'} opts.payloadType
 * @param {string} opts.payloadData
 * @param {'svg'|'png'|'jpg'} opts.format
 * @returns {Promise<string|Buffer>}
 */
async function buildPayload({
  payloadType,
  payloadData,
  format = 'svg'
}) {
  if (payloadType !== 'url') {
    throw new Error('Only static URL mode implemented.');
  }

  // SVG: returns a string
  if (format === 'svg') {
    return QRCode.toString(payloadData, { type: 'svg' });
  }

  // PNG: returns a Buffer
  if (format === 'png') {
    return QRCode.toBuffer(payloadData, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 4,
      scale: 4
    });
  }

  // JPG: generate PNG first, then re-encode as JPEG
  if (format === 'jpg' || format === 'jpeg') {
    const pngBuffer = await QRCode.toBuffer(payloadData, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 4,
      scale: 4
    });
    const image = await Jimp.read(pngBuffer);
    return image.getBufferAsync(Jimp.MIME_JPEG);
  }

  throw new Error(`Unsupported format: ${format}`);
}

module.exports = { buildPayload };
