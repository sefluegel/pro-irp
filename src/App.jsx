// /frontend/src/App.jsx

import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";

// Auth / app pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import Tasks from "./pages/Tasks";
import AEPWizard from "./pages/AEPWizard";
import OEPHub from "./pages/OEPHub";
import Settings from "./pages/Settings";
import Calendar from "./pages/Calendar";
import Automations from "./pages/Automations";

// Marketing pages (new)
import HomeSimple from "./pages/marketing/HomeSimple";
import AgentsPage from "./pages/marketing/AgentsPage";
import AgenciesPage from "./pages/marketing/AgenciesPage";
import FmoPage from "./pages/marketing/FmoPage";
import PricingPage from "./pages/marketing/PricingPage";

// Placeholders for pages not built yet
const NewClient = () => <div className="text-xl p-8">Add Client (Coming Soon)</div>;
const Policies  = () => <div className="text-xl p-8">Policies (Coming Soon)</div>;

/** Layouts **/
function PublicLayout() {
  // No sidebar on marketing/auth pages
  return (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
    </div>
  );
}

function AppLayout() {
  // Sidebar for the main app pages
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 bg-gray-50 p-6">
        <Outlet />
      </div>
    </div>
  );
}

const App = () => {
  const [clients, setClients] = useState([
    {
      id: 1,
      name: "Jane Doe",
      carrier: "UHC",
      plan: "PPO Advantage",
      phone: "555-123-4567",
      lastContact: "2024-07-10",
      // optional: add effectiveDate/firstWithAgent later if you want OEPHub to pick this up
    },
  ]);

  const addClient = (client) =>
    setClients((cs) => [...cs, { ...client, id: Date.now() }]);

  const updateClient = (updated) =>
    setClients((cs) => cs.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));

  return (
    <Router>
      <Routes>
        {/* Public routes (no Sidebar) */}
        <Route element={<PublicLayout />}>
          {/* Marketing */}
          <Route path="/" element={<HomeSimple />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/agencies" element={<AgenciesPage />} />
          <Route path="/fmo" element={<FmoPage />} />
          <Route path="/pricing" element={<PricingPage />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot" element={<ForgotPassword />} />
        </Route>

        {/* App routes (with Sidebar) */}
        <Route element={<AppLayout />}>
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

          {/* Feature Pages */}
          <Route path="/aep-wizard" element={<AEPWizard />} />
          <Route path="/oep" element={<OEPHub clients={clients} />} />
          {/* Removed WiffleBall; keep a redirect to avoid broken deep links */}
          <Route path="/wiffle-ball" element={<Navigate to="/dashboard" replace />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/automations" element={<Automations />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<div className="text-center text-xl p-8">404 Not Found</div>} />
      </Routes>
    </Router>
  );
};

export default App;
