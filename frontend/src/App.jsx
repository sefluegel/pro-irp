// /frontend/src/pages/App.jsx
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";

// Add placeholders for new pages
const NewClient      = () => <div className="text-xl p-8">Add Client (Coming Soon)</div>;
const PolicyReview   = () => <div className="text-xl p-8">Policy Review (Coming Soon)</div>;
const Broadcast      = () => <div className="text-xl p-8">Broadcast (Coming Soon)</div>;
const Policies       = () => <div className="text-xl p-8">Policies (Coming Soon)</div>;
const Tasks          = () => <div className="text-xl p-8">Tasks (Coming Soon)</div>;
const Settings       = () => <div className="text-xl p-8">Settings (Coming Soon)</div>;

const App = () => {
  // Example dummy clients. Replace/add real logic as you build!
  const [clients, setClients] = useState([
    {
      id: 1,
      name: "Jane Doe",
      carrier: "UHC",
      plan: "PPO Advantage",
      phone: "555-123-4567",
      lastContact: "2024-07-10",
      // ...other fields as needed
    },
    // ...add more if you like
  ]);

  // Add/edit logic (for demo)
  const addClient = (client) => setClients((cs) => [...cs, { ...client, id: Date.now() }]);
  const updateClient = (updated) =>
    setClients((cs) => cs.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));

  return (
    <Router>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <div style={{ flex: 1, background: "#f7f8fa", padding: "2rem" }}>
          <Routes>
            {/* Authentication */}
            <Route path="/"       element={<Login />} />
            <Route path="/login"  element={<Login />} />
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

            {/* Policy & Broadcast */}
            <Route path="/policies"        element={<Policies />} />
            <Route path="/policies/review" element={<PolicyReview />} />
            <Route path="/broadcast"       element={<Broadcast />} />

            {/* Other placeholders */}
            <Route path="/tasks"    element={<Tasks />} />
            <Route path="/settings" element={<Settings />} />

            {/* fallback 404 */}
            <Route path="*" element={<div className="text-center text-xl">404 Not Found</div>} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
