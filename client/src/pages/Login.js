import React, { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async e => {
    e.preventDefault();
    // call POST /auth/login, store JWT in localStorage...
  };

  return (
    <div className="page">
      <h1>Log In</h1>
      <form onSubmit={submit}>
        <label>Email</label>
        <input
          type="email" value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <label>Password</label>
        <input
          type="password" value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button type="submit">Log In</button>
      </form>
    </div>
  );
}
