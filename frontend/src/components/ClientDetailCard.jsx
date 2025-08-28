// /frontend/src/components/ClientDetailCard.jsx
import React, { useState } from "react";
import { Edit2, Save, X } from "lucide-react";

// On-brand blue background for the card
const CARD_BG = "#eaf3fb";      // soft, light blue
const CARD_TXT = "#172A3A";     // deep navy for text

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
    <span className="font-bold" style={{ color: CARD_TXT }}>{label}</span>
    {editing ? (
      <>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="border px-2 py-1 rounded text-base"
          style={{ color: CARD_TXT, background: "white" }}
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
        <span style={{ color: value ? CARD_TXT : "#64748b" }}>
          {value || <span className="text-gray-400">—</span>}
        </span>
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
    <div
      className="rounded-2xl shadow-lg p-8 mb-8 flex flex-col md:flex-row gap-12 border"
      style={{
        background: CARD_BG,
        color: CARD_TXT,
        borderColor: "#d2e2f3",
      }}
    >
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
        />
        <EditableField
          label="🗣️ Preferred Language:"
          value={client.preferredLanguage}
          editing={!!editing.preferredLanguage}
          setEditing={v => setEditing(e => ({ ...e, preferredLanguage: v }))}
          onChange={v => handleChange("preferredLanguage", v)}
        />
        <EditableField
          label="🏥 Carrier:"
          value={client.carrier}
          editing={!!editing.carrier}
          setEditing={v => setEditing(e => ({ ...e, carrier: v }))}
          onChange={v => handleChange("carrier", v)}
        />
        <EditableField
          label="💳 Plan:"
          value={client.plan}
          editing={!!editing.plan}
          setEditing={v => setEditing(e => ({ ...e, plan: v }))}
          onChange={v => handleChange("plan", v)}
        />
        <EditableField
          label="👨‍⚕️ Primary Care:"
          value={client.primaryCare}
          editing={!!editing.primaryCare}
          setEditing={v => setEditing(e => ({ ...e, primaryCare: v }))}
          onChange={v => handleChange("primaryCare", v)}
        />
        <EditableField
          label="👩‍⚕️ Specialists:"
          value={client.specialists}
          editing={!!editing.specialists}
          setEditing={v => setEditing(e => ({ ...e, specialists: v }))}
          onChange={v => handleChange("specialists", v)}
        />
        <EditableField
          label="💊 Medications:"
          value={client.medications}
          editing={!!editing.medications}
          setEditing={v => setEditing(e => ({ ...e, medications: v }))}
          onChange={v => handleChange("medications", v)}
        />
      </div>
      {/* Right: Uploads, SOA, Policies */}
      <div className="flex-1 space-y-3 text-lg">
        <div>
          <span className="font-bold" style={{ color: CARD_TXT }}>📄 SOA:</span>{" "}
          {client.soa?.onFile
            ? <span className="text-green-700 font-bold">On File ({client.soa.signed})</span>
            : <span className="text-red-600">Missing</span>
          }
        </div>
        <div>
          <span className="font-bold" style={{ color: CARD_TXT }}>📄 Permission to Contact:</span>{" "}
          {client.ptc?.onFile
            ? <span className="text-green-700 font-bold">On File ({client.ptc.signed})</span>
            : <span className="text-red-600">Missing</span>
          }
        </div>
        <div>
          <span className="font-bold" style={{ color: CARD_TXT }}>📝 Enrollment Form:</span>{" "}
          {client.enrollment?.onFile
            ? <span className="text-green-700 font-bold">On File</span>
            : <span className="text-red-600">Missing</span>
          }
        </div>
        <div>
          <span className="font-bold" style={{ color: CARD_TXT }}>📚 Policies:</span>{" "}
          {client.policies && client.policies.length
            ? (
              <ul className="list-disc ml-6">
                {client.policies.map((p, i) =>
                  <li key={i} style={{ color: CARD_TXT }}>
                    {p.carrier}: {p.plan} (Eff. {p.effective})
                  </li>
                )}
              </ul>
            )
            : <span style={{ color: "#64748b" }}>No other policies.</span>
          }
        </div>
        <div>
          <span className="font-bold" style={{ color: CARD_TXT }}>📎 Uploaded Files:</span>{" "}
          {client.uploads && client.uploads.length
            ? (
              <ul className="list-disc ml-6">
                {client.uploads.map((f, i) =>
                  <li key={i} style={{ color: CARD_TXT }}>
                    {f.label}: {f.file} ({f.date})
                  </li>
                )}
              </ul>
            )
            : <span style={{ color: "#64748b" }}>No uploads.</span>
          }
        </div>
      </div>
    </div>
  );
};

export default ClientDetailCard;
