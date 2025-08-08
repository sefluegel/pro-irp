// /frontend/src/pages/App.jsx
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Login from "./Login";
import Signup from "./Signup";
import ForgotPassword from "./ForgotPassword";
import Dashboard from "./Dashboard";
import Clients from "./Clients";
import ClientProfile from "./ClientProfile";
import Tasks from "./Tasks";
import Settings from "./Settings";
import Calendar from "./Calendar";      // Calendar import
import Automations from "./Automations"; // <-- Automations import

// Placeholders for pages not built yet
const NewClient = () => <div className="text-xl p-8">Add Client (Coming Soon)</div>;
const Policies  = () => <div className="text-xl p-8">Policies (Coming Soon)</div>;

const App = () => {
  const [clients, setClients] = useState([
    {
      id: 1,
      name: "Jane Doe",
      carrier: "UHC",
      plan: "PPO Advantage",
      phone: "555-123-4567",
      lastContact: "2024-07-10",
    },
  ]);

  const addClient = client => setClients(cs => [...cs, { ...client, id: Date.now() }]);
  const updateClient = updated =>
    setClients(cs => cs.map(c => (c.id === updated.id ? { ...c, ...updated } : c)));

  return (
    <Router>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 bg-gray-50 p-6">
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
            <Route path="/automations" element={<Automations />} />

            {/* 404 */}
            <Route path="*" element={<div className="text-center text-xl">404 Not Found</div>} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
