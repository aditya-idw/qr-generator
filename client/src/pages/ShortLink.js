// client/src/pages/ShortLink.js
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

export default function ShortLink() {
  const { user } = useContext(AuthContext);
  const [url, setUrl] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setShortUrl('');
    if (!url.trim()) {
      setError('Enter a Target URL to shorten.');
      return;
    }
    setLoading(true);
    try {
      const body = { url };
      if (customKey.trim()) {
        body.customKey = customKey.trim();
      }

      const res = await fetch('/short-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({}));
        throw new Error(msg || res.statusText);
      }
      const { key } = await res.json();
      setShortUrl(`${window.location.origin}/r/${key}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1>Create Short Link</h1>
      <form className="form" onSubmit={handleCreate}>
        <label>
          Target URL
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
          />
        </label>
        <label>
          Custom key (optional)
          <input
            type="text"
            value={customKey}
            onChange={e => setCustomKey(e.target.value)}
            placeholder="my-custom-key"
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create Short Link'}
        </button>
      </form>
      {error && <div className="error">{error}</div>}
      {shortUrl && (
        <p>
          Your short link: <a href={shortUrl}>{shortUrl}</a>
        </p>
      )}
    </div>
  );
}
