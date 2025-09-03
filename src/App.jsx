import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// Marketing pages (available but not default):
import HomeSimple from "./pages/marketing/HomeSimple";
import AgentsPage from "./pages/marketing/AgentsPage";
import AgenciesPage from "./pages/marketing/AgenciesPage";
import FmoPage from "./pages/marketing/FmoPage";
import PricingPage from "./pages/marketing/PricingPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      {/* Optional marketing routes for later demos */}
      <Route path="/home" element={<HomeSimple />} />
      <Route path="/agents" element={<AgentsPage />} />
      <Route path="/agencies" element={<AgenciesPage />} />
      <Route path="/fmo" element={<FmoPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      {/* signup can reuse Login for now */}
      <Route path="/signup" element={<Login />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
