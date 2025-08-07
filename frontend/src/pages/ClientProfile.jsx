import React, { useState } from "react";
import ClientRiskChart from "../components/ClientRiskChart";
import TakeActionMenu from "../components/TakeActionMenu";
import OutreachLog from "../components/OutreachLog";
import MessageThread from "../components/MessageThread";
import ClientScheduleModal from "../components/ClientScheduleModal";

// Demo/mock data for profile
const MOCK_CLIENT = {
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
};

const fields = [
  { key: "dob", label: "DOB", icon: "📅" },
  { key: "email", label: "Email", icon: "📧" },
  { key: "phone", label: "Phone", icon: "📞" },
  { key: "address", label: "Address", icon: "🏠" },
  { key: "effectiveDate", label: "Effective Date", icon: "🗓️" },
  { key: "preferredLanguage", label: "Preferred Language", icon: "🗣️" },
  { key: "carrier", label: "Carrier", icon: "🏢" },
  { key: "plan", label: "Plan", icon: "📄" },
  { key: "primaryCare", label: "Primary Care", icon: "👨‍⚕️" },
  { key: "specialists", label: "Specialists", icon: "👩‍⚕️" },
  { key: "medications", label: "Medications", icon: "💊" }
];

const ClientProfile = () => {
  // For demo, editable fields are local only (no backend)
  const [client, setClient] = useState(MOCK_CLIENT);
  const [editing, setEditing] = useState({});

  // Editable field handler
  const handleFieldChange = (key, value) => {
    setClient(prev => ({ ...prev, [key]: value }));
  };

  const handleEditToggle = (key) => {
    setEditing(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Calculate "Customer For" time
  const customerSince = (() => {
    const start = new Date(client.effectiveDate);
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear();
    const months = now.getMonth() - start.getMonth() + (years * 12);
    const yearsPart = Math.floor(months / 12);
    const monthsPart = months % 12;
    return `${yearsPart} year${yearsPart !== 1 ? "s" : ""}, ${monthsPart} month${monthsPart !== 1 ? "s" : ""}`;
  })();

  // Modals
  const [showSms, setShowSms] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 font-[Inter]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#172A3A] mb-1">
            {client.name}
          </h1>
          <div className="flex flex-wrap gap-x-7 gap-y-2 items-center text-[#536179] text-base md:text-lg font-medium">
            <span>🗓️ Customer for <b>{customerSince}</b></span>
            <span>• Last contact: <b>{client.lastContact}</b></span>
          </div>
        </div>
        {/* Risk Score & Action */}
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
          <div className="flex flex-col items-center">
            </span>
            <ClientRiskChart score={client.riskScore} />
          </div>
          <div>
            <TakeActionMenu
              smsUnread={client.smsUnread}
              emailUnread={client.emailUnread}
              onSms={() => setShowSms(true)}
              onEmail={() => setShowEmail(true)}
              onCall={() => alert("Calling client... (demo)")}
              onSchedule={() => setShowSchedule(true)}
            />
          </div>
        </div>
      </div>

      {/* Info Card, more compact with editability */}
      <div className="bg-white rounded-2xl shadow-md p-7 md:p-10 mb-10 grid grid-cols-1 md:grid-cols-2 gap-8 text-[15px]">
        <div className="space-y-3">
          {fields.slice(0, 6).map(f => (
            <div className="flex items-center gap-2" key={f.key}>
              <span className="text-lg">{f.icon}</span>
              <span className="font-bold">{f.label}:</span>
              {editing[f.key] ? (
                <input
                  className="ml-2 border-b border-gray-300 focus:outline-none focus:border-blue-400 transition w-48"
                  value={client[f.key]}
                  onChange={e => handleFieldChange(f.key, e.target.value)}
                  onBlur={() => handleEditToggle(f.key)}
                  autoFocus
                />
              ) : (
                <span className="ml-2" onClick={() => handleEditToggle(f.key)} style={{ cursor: "pointer" }}>
                  {client[f.key]}
                  <span className="ml-2 text-gray-300 hover:text-blue-400 transition">✎</span>
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {fields.slice(6).map(f => (
            <div className="flex items-center gap-2" key={f.key}>
              <span className="text-lg">{f.icon}</span>
              <span className="font-bold">{f.label}:</span>
              {editing[f.key] ? (
                <input
                  className="ml-2 border-b border-gray-300 focus:outline-none focus:border-blue-400 transition w-48"
                  value={client[f.key]}
                  onChange={e => handleFieldChange(f.key, e.target.value)}
                  onBlur={() => handleEditToggle(f.key)}
                  autoFocus
                />
              ) : (
                <span className="ml-2" onClick={() => handleEditToggle(f.key)} style={{ cursor: "pointer" }}>
                  {client[f.key]}
                  <span className="ml-2 text-gray-300 hover:text-blue-400 transition">✎</span>
                </span>
              )}
            </div>
          ))}
          {/* Notes field at the bottom */}
          <div className="flex items-start gap-2 mt-2">
            <span className="text-lg">📝</span>
            <span className="font-bold">Notes:</span>
            {editing["notes"] ? (
              <textarea
                className="ml-2 border-b border-gray-300 focus:outline-none focus:border-blue-400 transition w-60 min-h-[40px]"
                value={client["notes"]}
                onChange={e => handleFieldChange("notes", e.target.value)}
                onBlur={() => handleEditToggle("notes")}
                autoFocus
              />
            ) : (
              <span className="ml-2" onClick={() => handleEditToggle("notes")} style={{ cursor: "pointer" }}>
                {client["notes"] || <span className="text-gray-400">No notes</span>}
                <span className="ml-2 text-gray-300 hover:text-blue-400 transition">✎</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Documents and policies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div>
          <div className="font-bold mb-2 text-[#172A3A]">Documents & Compliance</div>
          <div className="mb-1">
            <span className="font-semibold">SOA:</span>{" "}
            {client.soa.onFile ? (
              <span className="text-green-600">On File <span className="text-xs">({client.soa.signed})</span></span>
            ) : (
              <span className="text-red-500">Missing</span>
            )}
          </div>
          <div className="mb-1">
            <span className="font-semibold">Permission to Contact:</span>{" "}
            {client.ptc.onFile ? (
              <span className="text-green-600">On File <span className="text-xs">({client.ptc.signed})</span></span>
            ) : (
              <span className="text-red-500">Missing</span>
            )}
          </div>
          <div className="mb-1">
            <span className="font-semibold">Enrollment Form:</span>{" "}
            {client.enrollment.onFile ? (
              <span className="text-green-600">On File</span>
            ) : (
              <span className="text-red-500">Missing</span>
            )}
          </div>
          <div className="font-bold mt-4 mb-2 text-[#172A3A]">Policies:</div>
          <ul className="list-disc list-inside ml-2 text-sm">
            {client.policies.map((p, i) => (
              <li key={i}>{p.carrier}: {p.plan} (Eff. {p.effective})</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="font-bold mb-2 text-[#172A3A]">Uploaded Files:</div>
          <ul className="list-disc list-inside ml-2 text-sm">
            {client.uploads.map((f, i) => (
              <li key={i}>{f.label}: {f.file} ({f.date})</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Outreach Log */}
      <div className="mt-10">
        <OutreachLog outreach={client.outreach} />
      </div>

      {/* Modals */}
      {showSms && (
        <MessageThread
          channel="sms"
          thread={client.messages.sms}
          onClose={() => setShowSms(false)}
          unread={client.smsUnread}
          clientName={client.name}
        />
      )}
      {showEmail && (
        <MessageThread
          channel="email"
          thread={client.messages.email}
          onClose={() => setShowEmail(false)}
          unread={client.emailUnread}
          clientName={client.name}
        />
      )}
      {showSchedule && (
        <ClientScheduleModal onClose={() => setShowSchedule(false)} client={client} />
      )}
    </div>
  );
};

export default ClientProfile;
