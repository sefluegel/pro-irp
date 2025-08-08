import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import Tasks from "./pages/Tasks";
import Settings from "./pages/Settings";
import Calendar from "./pages/Calendar";  // <--- NEW: Calendar import

// *** ADD THIS IMPORT ***
import Automations from "./pages/Automations";

// Placeholders for pages not built yet
const NewClient = () => <div className="text-xl p-8">Add Client (Coming Soon)</div>;
const Policies  = () => <div className="text-xl p-8">Policies (Coming Soon)</div>;

// ...[rest of code stays the same]...

<Routes>
  {/* Auth */}
  <Route path="/" element={<Navigate to="/login" replace />} />
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<Signup />} />
  <Route path="/forgot" element={<ForgotPassword />} />

  {/* Main App */}
  <Route
    path="/dashboard"
    element={
      <Dashboard
        clients={clients}
        onAddClient={addClient}
        onUpdateClient={updateClient}
      />
    }
  />
  <Route
    path="/clients"
    element={
      <Clients
        clients={clients}
        onAddClient={addClient}
        onUpdateClient={updateClient}
      />
    }
  />
  <Route path="/clients/new" element={<NewClient />} />
  <Route path="/clients/:id" element={<ClientProfile clients={clients} />} />

  {/* Other pages */}
  <Route path="/policies" element={<Policies />} />
  <Route path="/tasks" element={<Tasks />} />
  <Route path="/settings" element={<Settings />} />
  <Route path="/calendar" element={<Calendar />} />
  
  {/* *** ADD THIS ROUTE *** */}
  <Route path="/automations" element={<Automations />} />

  {/* 404 */}
  <Route path="*" element={<div className="text-center text-xl">404 Not Found</div>} />
</Routes>
