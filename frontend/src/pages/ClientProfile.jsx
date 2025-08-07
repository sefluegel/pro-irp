import React, { useState } from "react";
import ClientDetailCard from "../components/ClientDetailCard";
import ClientRiskChart from "../components/ClientRiskChart";
import { Phone, MessageCircle, Calendar, Mail, AlertCircle, ChevronRight } from "lucide-react";

// --- MOCK DATA --- //
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
  medications: "Aspirin, Lisinopril, Jardiance (added 07/2025, Tier 4)",
  carrier: "UHC",
  plan: "UHC1",
  riskScore: 87,
  notes: "Client recently changed address; new medication prescribed.",
  soa: { onFile: true, signed: "2024-03-18" },
  ptc: { onFile: true, signed: "2024-02-15" },
  enrollment: { onFile: false },
  policies: [
    { type: "MAPD", carrier: "Aetna", plan: "PPO Value", effective: "2018-01-01" },
    { type: "Final Expense", carrier: "Mutual of Omaha", plan: "Level Benefit", effective: "2022-06-14" }
  ],
  uploads: [
    { label: "SOA", file: "jane_soa.pdf", date: "2024-03-18" },
    { label: "PTC", file: "jane_ptc.pdf", date: "2024-02-15" }
  ]
};

const MOCK_RISK_DETAILS = {
  score: 87,
  tier: "High",
  explanation: "Client risk score is high due to multiple major triggers. Immediate attention recommended.",
  triggers: [
    {
      label: "Added Tier 4 Medication",
      detail: "Jardiance prescribed on 07/05/2025 (Tier 4 drug).",
      icon: <AlertCircle className="text-red-500" size={16} />,
      date: "2025-07-05"
    },
    {
      label: "No contact in 264 days",
      detail: "Last contact was over 8 months ago.",
      icon: <AlertCircle className="text-yellow-500" size={16} />,
      date: "2024-11-15"
    },
    {
      label: "Doctor leaving network",
      detail: "Primary care Dr. Bob Smith is leaving network next month.",
      icon: <AlertCircle className="text-red-400" size={16} />,
      date: "2025-08-01"
    }
  ]
};

const MOCK_AUTOMATIONS = [
  {
    type: "SMS",
    summary: "Check-in text sent (high risk: new medication)",
    date: "2025-07-06 09:12",
    action: "sms",
    id: 1234
  },
  {
    type: "Email",
    summary: "Provider network change alert email sent",
    date: "2025-07-07 15:22",
    action: "email",
    id: 5678
  },
  {
    type: "Newsletter",
    summary: "Monthly health newsletter sent",
    date: "2025-07-10 08:00",
    action: "newsletter",
    id: 9101
  }
];

const MOCK_TASKS = [
  {
    type: "Call",
    label: "Check-in call (Tier 4 med)",
    due: "Today",
    action: "call",
    id: 201
  },
  {
    type: "Text",
    label: "Send 'Provider change' text",
    due: "Tomorrow",
    action: "sms",
    id: 202
  },
  {
    type: "Appt",
    label: "Schedule policy review",
    due: "Due in 3 days",
    action: "calendar",
    id: 203
  }
];

const actionButton = (type, label, onClick) => {
  const icons = {
    call: <Phone size={18} className="text-blue-600" />,
    sms: <MessageCircle size={18} className="text-green-600" />,
    calendar: <Calendar size={18} className="text-indigo-500" />,
    email: <Mail size={18} className="text-yellow-600" />,
    newsletter: <Mail size={18} className="text-gray-400" />
  };
  return (
    <button
      className="rounded-full p-2 hover:bg-gray-100 transition"
      onClick={onClick}
      title={label}
    >
      {icons[type] || <ChevronRight />}
    </button>
  );
};

const ClientProfile = () => {
  const [client] = useState(MOCK_CLIENT);

  // Customer since calculation
  const customerSince = (() => {
    const start = new Date(client.effectiveDate);
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear();
    const months = now.getMonth() - start.getMonth() + (years * 12);
    const yearsPart = Math.floor(months / 12);
    const monthsPart = months % 12;
    return `${yearsPart} year${yearsPart !== 1 ? "s" : ""}, ${monthsPart} month${monthsPart !== 1 ? "s" : ""}`;
  })();

  return (
    <div className="max-w-7xl mx-auto px-2 py-8 font-[Inter]">
      {/* ----------- HEADER ----------- */}
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#172A3A] mb-1 leading-tight">
          {client.name}
        </h1>
        <div className="flex flex-wrap gap-x-7 gap-y-1 items-center text-[#536179] text-sm md:text-base font-medium mb-2">
          <span>🗓️ Customer for <b>{customerSince}</b></span>
          <span>• Last contact: <b>{client.lastContact}</b></span>
          <span className="flex items-center gap-1">
            <ClientRiskChart score={MOCK_RISK_DETAILS.score} small />
            <span className={`font-bold ${MOCK_RISK_DETAILS.tier === "High" ? "text-red-600" : MOCK_RISK_DETAILS.tier === "Medium" ? "text-yellow-500" : "text-green-600"}`}>
              {MOCK_RISK_DETAILS.tier} Risk
            </span>
            <span className="text-gray-500 text-sm">(Score: {MOCK_RISK_DETAILS.score})</span>
          </span>
        </div>
      </div>

      {/* ----------- TOP HALF: 2-COLUMN SPLIT ----------- */}
      <div className="flex flex-col md:flex-row gap-6 mb-6" style={{ minHeight: 320 }}>
        {/* LEFT: Retention Risk Box */}
        <div className="w-full md:w-1/2 flex flex-col">
          <div className="bg-white shadow-xl rounded-xl border border-red-200 p-5 flex-1 min-h-[280px]">
            <div className="flex items-center gap-2 mb-2">
              <ClientRiskChart score={MOCK_RISK_DETAILS.score} small />
              <span className={`text-lg font-bold mr-2 ${MOCK_RISK_DETAILS.tier === "High" ? "text-red-600" : MOCK_RISK_DETAILS.tier === "Medium" ? "text-yellow-500" : "text-green-600"}`}>
                {MOCK_RISK_DETAILS.tier} Risk
              </span>
              <span className="text-gray-500 text-sm">(Score: {MOCK_RISK_DETAILS.score})</span>
            </div>
            <div className="text-gray-800 text-sm mb-2">{MOCK_RISK_DETAILS.explanation}</div>
            <div className="text-xs text-[#b91c1c] font-semibold mb-1">Red Flags:</div>
            <ul className="text-xs space-y-1">
              {MOCK_RISK_DETAILS.triggers.map((t, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="mt-0.5">{t.icon}</span>
                  <div>
                    <b>{t.label}</b> <span className="text-gray-500">({t.date})</span>
                    <div className="text-gray-700">{t.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* RIGHT: Previous Communication + Tasks (stacked) */}
        <div className="w-full md:w-1/2 flex flex-col gap-4">
          {/* Previous Communication/Automations */}
          <div className="bg-white shadow-xl rounded-xl border p-4 flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[#172A3A] text-base">Recent Communication</span>
            </div>
            <ul className="text-sm space-y-2">
              {MOCK_AUTOMATIONS.map(a => (
                <li key={a.id} className="flex gap-2 items-center">
                  {actionButton(a.action, a.type, () => {})}
                  <div className="flex-1">
                    <span className="font-medium">{a.summary}</span>
                    <span className="block text-xs text-gray-500">{a.date}</span>
                  </div>
                  <button
                    onClick={() => {}}
                    className="ml-1 text-blue-600 hover:underline text-xs"
                  >
                    View
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {/* Tasks Due */}
          <div className="bg-white shadow-xl rounded-xl border p-4 flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[#172A3A] text-base">Tasks Due</span>
            </div>
            <ul className="text-sm space-y-2">
              {MOCK_TASKS.map(task => (
                <li key={task.id} className="flex gap-2 items-center">
                  {actionButton(task.action, task.type, () => {})}
                  <div className="flex-1">
                    <span className="font-medium">{task.label}</span>
                    <span className="block text-xs text-gray-500">{task.due}</span>
                  </div>
                  <button
                    onClick={() => {}}
                    className="ml-1 text-blue-600 hover:underline text-xs"
                  >
                    Complete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ----------- BOTTOM HALF: CLIENT DETAIL CARD ----------- */}
      <div className="w-full">
        <ClientDetailCard client={client} />
      </div>
    </div>
  );
};

export default ClientProfile;

