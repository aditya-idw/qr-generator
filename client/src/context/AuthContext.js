// client/src/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // On mount, load JWT and user info from localStorage
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('email');
    const roles = JSON.parse(localStorage.getItem('roles') || '[]');
    if (token && email) {
      setUser({ email, token, roles });
    }
  }, []);

  function login({ email, token, roles }) {
    localStorage.setItem('token', token);
    localStorage.setItem('email', email);
    localStorage.setItem('roles', JSON.stringify(roles));
    setUser({ email, token, roles });
  }

  function logout() {
    localStorage.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
