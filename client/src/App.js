import React, { useState } from 'react';
import './App.css';

function App() {
  const [payload, setPayload] = useState('');
  const [format, setFormat] = useState('svg');
  const [qr, setQr] = useState(null);
  const [error, setError] = useState('');

  async function generate() {
    setError('');
    setQr(null);
    if (!payload) {
      setError('Enter a URL or text to encode.');
      return;
    }

    try {
      const res = await fetch('/generateQr', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // for GET, we put parameters in query string:
      });

      // Instead, build the URL manually:
      const qs = new URLSearchParams({ payloadType: 'url', payloadData: payload, format });
      const r = await fetch(`/generateQr?${qs.toString()}`);
      if (!r.ok) throw new Error(await r.text());
      if (format === 'svg') {
        const text = await r.text();
        setQr({ type: 'svg', data: text });
      } else {
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        setQr({ type: 'img', data: url });
      }
    } catch (e) {
      setError(e.message);
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

        <button onClick={generate}>Generate QR</button>
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
