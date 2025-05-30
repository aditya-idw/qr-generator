// client/src/App.js
import React, { useState } from 'react';
import './App.css';

function App() {
  const [payload, setPayload] = useState('');
  const [format, setFormat] = useState('svg');
  const [qr, setQr] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function generate() {
    setError('');
    setQr(null);

    if (!payload.trim()) {
      setError('Enter a URL or text to encode.');
      return;
    }

    setLoading(true);
    try {
      // Build query string for GET
      const qs = new URLSearchParams({
        payloadType: 'url',
        payloadData: payload,
        format,
      });

      const res = await fetch(`/generateQr?${qs.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }

      if (format === 'svg') {
        const text = await res.text();
        setQr({ type: 'svg', data: text });
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setQr({ type: 'img', data: url });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="App">
      <h1>QR Code Generator</h1>

      <div className="form">
        <label>
          URL or Text:
          <input
            type="text"
            value={payload}
            onChange={e => setPayload(e.target.value)}
            placeholder="https://example.com"
          />
        </label>

        <label>
          Format:
          <select value={format} onChange={e => setFormat(e.target.value)}>
            <option value="svg">SVG</option>
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
          </select>
        </label>

        <button onClick={generate} disabled={loading}>
          {loading ? 'Generating…' : 'Generate QR'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {qr && qr.type === 'svg' && (
        <div
          className="qr-display"
          dangerouslySetInnerHTML={{ __html: qr.data }}
        />
      )}

      {qr && qr.type === 'img' && (
        <img className="qr-display" src={qr.data} alt="Generated QR" />
      )}
    </div>
  );
}

export default App;
