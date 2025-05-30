// src/components/PrivateRoute.js
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/**
 * Wrap your route element in:
 *   <Route path="/account" element={<PrivateRoute><Account /></PrivateRoute>} />
 */
export default function PrivateRoute({ children }) {
  const { user } = useContext(AuthContext);

  if (!user) {
    // Not logged in, redirect to login
    return <Navigate to="/login" replace />;
  }

  // Otherwise render the protected component
  return children;
}
