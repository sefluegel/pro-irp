// /frontend/src/components/ClientDetailCard.jsx
import React, { useState } from "react";
import { Edit2, Save, X, Plus } from "lucide-react";

const EditableField = ({
  label,
  value,
  onChange,
  editing,
  setEditing,
  type = "text",
  ...props
}) => (
  <div className="flex items-center gap-2">
    <span className="font-bold">{label}</span>
    {editing ? (
      <>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="border px-2 py-1 rounded text-base"
          {...props}
        />
        <button onClick={() => setEditing(false)} className="text-green-600">
          <Save size={18} />
        </button>
        <button onClick={() => setEditing(false)} className="text-gray-400">
          <X size={18} />
        </button>
      </>
    ) : (
      <>
        <span>{value || <span className="text-gray-400">—</span>}</span>
        <button onClick={() => setEditing(true)} className="ml-1">
          <Edit2 size={16} />
        </button>
      </>
    )}
  </div>
);

const ClientDetailCard = ({ client: origClient }) => {
  // Local state for edit fields
  const [client, setClient] = useState({ ...origClient });
  const [editing, setEditing] = useState({}); // which fields are being edited

  // Save/cancel actions could be connected to an API in production!
  const handleChange = (key, value) => setClient(c => ({ ...c, [key]: value }));

  // ----- Render -----
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 flex flex-col md:flex-row gap-12">
      {/* Left: Info */}
      <div className="flex-1 space-y-2 text-lg">
        <EditableField
          label="📅 DOB:"
          value={client.dob}
          editing={!!editing.dob}
          setEditing={v => setEditing(e => ({ ...e, dob: v }))}
          onChange={v => handleChange("dob", v)}
        />
        <EditableField
          label="📧 Email:"
          value={client.email}
          editing={!!editing.email}
          setEditing={v => setEditing(e => ({ ...e, email: v }))}
          onChange={v => handleChange("email", v)}
        />
        <EditableField
          label="📞 Phone:"
          value={client.phone}
          editing={!!editing.phone}
          setEditing={v => setEditing(e => ({ ...e, phone: v }))}
          onChange={v => handleChange("phone", v)}
        />
        <EditableField
          label="🏠 Address:"
          value={`${client.address}, ${client.city}, ${client.state} ${client.zip}`}
          editing={!!editing.address}
          setEditing={v => setEditing(e => ({ ...e, address: v }))}
          onChange={v => {
            // Optionally parse for real use!
            const parts = v.split(",");
            handleChange("address", parts[0]?.trim() || "");
            handleChange("city", parts[1]?.trim() || "");
            if (parts[2]) {
              const [state, zip] = parts[2].trim().split(" ");
              handleChange("state", state || "");
              handleChange("zip", zip || "");
            }
          }}
        />
        <EditableField
          label="🗓️ Effective Date:"
          value={client.effectiveDate}
          editing={!!editing.effectiveDate}
          setEditing={v => setEditing(e => ({ ...e, effectiveDate: v }))}
          onChange={v => handleChange("effectiveDate", v)}
