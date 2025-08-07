// /frontend/src/pages/Dashboard.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ClientForm from "../components/ClientForm";
import { Plus } from "lucide-react";

const Dashboard = ({ clients, onAddClient, onUpdateClient }) => {
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const handleSave = client => {
    onAddClient(client);
    setShowForm(false);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold text-[#172A3A] flex items-center gap-2">📊 Dashboard</h1>
        <button
          className="flex items-center gap-2 bg-[#FFB800] text-[#172A3A] font-bold px-5 py-2 rounded-xl shadow hover:bg-yellow-400 transition"
          onClick={() => setShowForm(true)}
        >
          <Plus size={20} /> Add Client
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">👥 Recent Clients</h2>
        <table className="min-w-full text-base">
          <thead>
            <tr className="bg-[#F4F6FA]">
              <th className="py-3 px-4 text-left font-bold">👤 Name</th>
              <th className="py-3 px-4 text-left font-bold">🏥 Carrier</th>
              <th className="py-3 px-4 text-left font-bold">🛡️ Plan</th>
              <th className="py-3 px-4 text-left font-bold"></th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  No clients found.
                </td>
              </tr>
            )}
            {clients.map(client => (
              <tr key={client.id} className="border-b hover:bg-[#FFFAE6]">
                <td className="py-3 px-4 font-bold text-[#172A3A]">
                  <button
                    className="flex items-center gap-2 hover:underline"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    👤 {client.name}
                  </button>
                </td>
                <td className="py-3 px-4">{client.carrier}</td>
                <td className="py-3 px-4">{client.plan}</td>
                <td className="py-3 px-4"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl min-w-[340px] max-w-xl w-full relative">
            <ClientForm
              onSave={handleSave}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
