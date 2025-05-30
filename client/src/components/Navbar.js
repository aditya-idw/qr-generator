// src/components/Navbar.js
import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar__brand">QR & ShortLink</Link>
      <ul className="navbar__links">
        <li><Link to="/generate-qr">Generate QR</Link></li>
        {user && <li><Link to="/short-link">Short Link</Link></li>}
        {user && <li><Link to="/account">Account</Link></li>}
      </ul>
      <div className="navbar__auth">
        {user ? (
          <>
            <span className="navbar__user">Hello, {user.email}</span>
            <button onClick={handleLogout} className="navbar__btn">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar__btn">Login</Link>
            <Link to="/signup" className="navbar__btn">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
);
}
