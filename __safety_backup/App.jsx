import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// DO NOT import HomeSimple for now
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <Routes>
      {/* redirect root to login for now */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />

      {/* you can keep signup pointing to Login for now */}
      <Route path="/signup" element={<Login />} />

      {/* catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
