// /frontend/src/pages/Clients.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ClientForm from "../components/ClientForm";
import { Plus, Pencil } from "lucide-react";

const Clients = ({ clients, onAddClient, onUpdateClient }) => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState(null);

  // Save new or edited client
  const handleSave = data => {
    if (editClient) onUpdateClient(data);
    else onAddClient(data);
    setShowForm(false);
    setEditClient(null);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold text-[#172A3A] mb-1">Clients</h1>
        <button
          className="flex items-center gap-2 bg-[#FFB800] text-[#172A3A] font-bold px-5 py-2 rounded-xl shadow hover:bg-yellow-400 transition"
          onClick={() => { setShowForm(true); setEditClient(null); }}
        >
          <Plus size={20} /> Add Client
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl shadow bg-white">
        <table className="min-w-full text-base">
          <thead>
            <tr className="bg-[#172A3A] text-white">
              <th className="py-3 px-4 text-left font-bold">Name</th>
              <th className="py-3 px-4 text-left font-bold">Carrier</th>
              <th className="py-3 px-4 text-left font-bold">Plan</th>
              <th className="py-3 px-4 text-left font-bold">Phone</th>
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
                <td className="py-3 px-4 font-bold text
