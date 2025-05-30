import React, { useEffect, useState } from 'react';

export default function Account() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // fetch user profile via JWT or API-key
  }, []);

  if (!user) return <div>Loading...</div>;

  return (
    <div className="page">
      <h1>My Account</h1>
      <p>Email: {user.email}</p>
      <p>Roles: {user.roles.join(', ')}</p>
      {/* List API keys, regenerate, revoke, etc. */}
    </div>
  );
}
