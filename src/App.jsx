import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import HomeSimple from "./pages/HomeSimple";   // marketing landing
import Login from "./pages/Login";             // login page
import Dashboard from "./pages/Dashboard";     // dashboard

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeSimple />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/signup" element={<Login />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
