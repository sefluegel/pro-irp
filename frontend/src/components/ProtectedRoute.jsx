// frontend/src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const isLoggedIn = Boolean(localStorage.getItem("token"));
  if (isLoggedIn) {
    return children;
  }
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;
