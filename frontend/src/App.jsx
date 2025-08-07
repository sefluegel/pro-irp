// /frontend/src/App.jsx
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

const App = () => {
  // Simple client data storage at App level for demo
  const [clients, setClients] = useState([
    {
      id: 1,
      name: "Jane Doe",
      dob: "1955-04-12",
      email: "jane.doe@email.com",
      phone: "859-555-1212",
      address: "123 Main St",
      city: "Hebron",
      state: "KY",
      zip: "41048",
      effectiveDate: "2021-03-05",
      lastContact: "2024-07-12",
      preferredLanguage: "en",
      primaryCare: "Dr. Bob Smith",
      specialists: "Dr. Jane Specialist, Dr. Tim Ortho",
      medications: "Aspirin, Lisinopril",
      carrier: "uhc",
      plan: "uhc1",
      riskScore: 83,
      notes: "",
      soa: { onFile: true, signed: "2024-03-18" },
      ptc: { onFile: true, signed: "2024-02-15" },
      enrollment: { onFile: false },
      policies: [
        { carrier: "Aetna", plan: "Aetna PPO Value", effective: "2018-01-01" }
      ],
      uploads: [
        { label: "SOA", file: "jane_soa.pdf", date: "2024-03-18" },
        { label: "PTC", file: "jane_ptc.pdf", date: "2024-02-15" }
      ],
      outreach: [
        { date: "2025-08-07T10:12:00", type: "birthday", desc: "🎂 Birthday message sent" },
        { date: "2025-07-22T07:00:00", type: "retention", desc: "🔁 Retention email sent" },
        { date: "2025-06-15T13:22:00", type: "newsletter", desc: "📰 Newsletter sent" }
      ],
      smsUnread: 1,
      emailUnread: 0,
      messages: {
        sms: [
          { from: "client", text: "Can you call me tomorrow?", date: "2025-08-06T09:01:00", read: false },
          { from: "agent", text: "Absolutely! What time works?", date: "2025-08-06T09:05:00", read: true },
        ],
        email: [
          { from: "agent", text: "Welcome to Pro IRP!", date: "2025-07-22T07:01:00", read: true }
        ]
      }
    },
    // Add more mock clients if you want
  ]);

  // Add/edit logic (for demo, this could be lifted higher for real use)
  const addClient = client => setClients(c => [...c, { ...client, id: Date.now() }]);
  const updateClient = updated =>
    setClients(cs => cs.map(c => (c.id === updated.id ? { ...c, ...updated } : c)));

  return (
    <Router>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 bg-[#F4F6FA]">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={
              <Dashboard
                clients={clients}
                onAddClient={addClient}
                onUpdateClient={updateClient}
              />
            } />
            <Route path="/clients" element={
              <Clients
                clients={clients}
                onAddClient={addClient}
                onUpdateClient={updateClient}
              />
            } />
            <Route path="/clients/:id" element={
              <ClientProfile clients={clients} />
            } />
            <Route path="*" element={<div className="p-12 text-2xl">404 Not Found</div>} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
