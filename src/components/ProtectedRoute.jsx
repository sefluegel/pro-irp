// frontend/src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getToken } from "../auth/Auth";

export default function ProtectedRoute({ children }) {
  const token = getToken();
  const location = useLocation();

  // If there is no token, send user to the login page ("/")
  if (!token) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // If token exists, allow access to the protected page
  return children;
}
