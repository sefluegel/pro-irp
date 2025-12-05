import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layout
import AppLayout from "./layouts/AppLayout.jsx";

// Core pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import FounderDashboard from "./pages/FounderDashboard";
import Clients from "./pages/Clients";
import Tasks from "./pages/Tasks";
import Policies from "./pages/Policies";
import Settings from "./pages/Settings";
import Automations from "./pages/Automations";
import AEPWizard from "./pages/AEPWizard";
import OEPHub from "./pages/OEPHub";
import Calendar from "./pages/Calendar";

// Auth flow
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Import/Export helpers
import ImportClients from "./pages/ImportClients";
import ExportClients from "./pages/ExportClients";

// Client profile (you already have this file)
import ClientProfile from "./pages/ClientProfile";

// New: full add page
import AddClient from "./pages/AddClient";

// Founder Command Center pages
import FounderCommandCenter from "./pages/FounderCommandCenter";
import AgentAdoption from "./pages/founder/AgentAdoption";
import ClientQuality from "./pages/founder/ClientQuality";
import ValueDelivery from "./pages/founder/ValueDelivery";
import SystemHealth from "./pages/founder/SystemHealth";

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      {/* Auth (no layout) */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/reset" element={<ResetPassword />} />

      {/* Public helper routes for import/export pages */}
      <Route path="/clients/import" element={<ImportClients />} />
      <Route path="/clients/export" element={<ExportClients />} />

      {/* App routes (protected + layout) */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/founder-dashboard" element={<FounderDashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/new" element={<AddClient />} />
        <Route path="/clients/:id" element={<ClientProfile />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/policies" element={<Policies />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/automations" element={<Automations />} />
        <Route path="/aep-wizard" element={<AEPWizard />} />
        <Route path="/oep" element={<OEPHub />} />
        <Route path="/calendar" element={<Calendar />} />

        {/* Founder Command Center routes */}
        <Route path="/founder" element={<FounderCommandCenter />} />
        <Route path="/founder/adoption" element={<AgentAdoption />} />
        <Route path="/founder/client-quality" element={<ClientQuality />} />
        <Route path="/founder/value" element={<ValueDelivery />} />
        <Route path="/founder/system-health" element={<SystemHealth />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
