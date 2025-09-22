import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layout
import AppLayout from "./layouts/AppLayout.jsx";

// Core pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Tasks from "./pages/Tasks";
import Policies from "./pages/Policies";
import Settings from "./pages/Settings";
import Automations from "./pages/Automations";
import AEPWizard from "./pages/AEPWizard";
import OEPHub from "./pages/OEPHub";

// Marketing pages (optional)
import HomeSimple from "./pages/marketing/HomeSimple";
import AgentsPage from "./pages/marketing/AgentsPage";
import AgenciesPage from "./pages/marketing/AgenciesPage";
import FmoPage from "./pages/marketing/FmoPage";
import PricingPage from "./pages/marketing/PricingPage";

export default function App() {
  return (
    <Routes>
      {/* Auth (no layout) */}
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Login />} />

      {/* App pages share the layout with your Sidebar */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/policies" element={<Policies />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/automations" element={<Automations />} />
        <Route path="/aep-wizard" element={<AEPWizard />} />
        <Route path="/oep" element={<OEPHub />} />
      </Route>

      {/* Marketing (optional) */}
      <Route path="/home" element={<HomeSimple />} />
      <Route path="/agents" element={<AgentsPage />} />
      <Route path="/agencies" element={<AgenciesPage />} />
      <Route path="/fmo" element={<FmoPage />} />
      <Route path="/pricing" element={<PricingPage />} />

      {/* Catch-all → login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
