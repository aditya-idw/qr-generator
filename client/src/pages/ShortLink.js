import React, { useState } from 'react';

export default function ShortLink() {
  const [url, setUrl] = useState('');
  const [short, setShort] = useState('');

  const create = async e => {
    e.preventDefault();
    // POST to /users/:id/api-keys or dedicated short-link endpoint
    // display the returned /r/{key} link
  };

  return (
    <div className="page">
      <h1>Create Short Link</h1>
      <form onSubmit={create}>
        <label>Target URL</label>
        <input
          type="text" value={url}
          onChange={e => setUrl(e.target.value)}
        />
        <button type="submit">Create</button>
      </form>
      {short && (
        <p>
          Your short link: <a href={short}>{short}</a>
        </p>
      )}
    </div>
  );
}
