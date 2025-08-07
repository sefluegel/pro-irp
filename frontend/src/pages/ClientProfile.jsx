// /frontend/src/pages/ClientProfile.jsx
import React, { useState } from "react";
import ClientRiskChart from "../components/ClientRiskChart";
import TakeActionMenu from "../components/TakeActionMenu";
import OutreachLog from "../components/OutreachLog";
import MessageThread from "../components/MessageThread";
import ClientScheduleModal from "../components/ClientScheduleModal";
import ClientDetailCard from "../components/ClientDetailCard";
import {
  Phone,
  MessageCircle,
  Mail,
  CalendarClock,
} from "lucide-react";

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
  riskScore: 87,
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

const retentionDetail = {
  explanation: "Client risk score is high due to multiple major triggers. Immediate attention recommended.",
  flags: [
    {
      title: "Added Tier 4 Medication",
      date: "2025-07-05",
      detail: "Jardiance prescribed on 07/05/2025 (Tier 4 drug).",
    },
    {
      title: "No contact in 264 days",
      date: "2024-11-15",
      detail: "Last contact was over 8 months ago.",
    },
    {
      title: "Doctor leaving network",
      date: "2025-08-01",
      detail: "Primary care Dr. Bob Smith is leaving network next month.",
    },
  ]
};

const recentComms = [
  {
    type: "sms",
    text: "Check-in text sent (high risk: new medication)",
    date: "2025-07-06 09:12",
    link: "#",
  },
  {
    type: "email",
    text: "Provider network change alert email sent",
    date: "2025-07-07 15:22",
    link: "#",
  },
  {
    type: "newsletter",
    text: "Monthly health newsletter sent",
    date: "2025-07-10 08:00",
    link: "#",
  },
];

const tasksDue = [
  {
    type: "call",
    text: "Check-in call (Tier 4 med)",
    due: "Today",
    action: "call",
    complete: false,
  },
  {
    type: "sms",
    text: "Send 'Provider change' text",
    due: "Tomorrow",
    action: "sms",
    complete: false,
  },
  {
    type: "calendar",
    text: "Schedule policy review",
    due: "Due in 3 days",
    action: "calendar",
    complete: false,
  },
];

const ClientProfile = () => {
  const [client] = useState(MOCK_CLIENT);
  const [showSms, setShowSms] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

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

  // --- Render ---
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 font-[Inter]">
      {/* Header with client info and Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-4">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#172A3A] mb-1">
            {client.name}
          </h1>
          <div className="flex flex-wrap gap-x-7 gap-y-2 items-center text-[#536179] text-[15px] md:text-base font-medium">
            <span>🗓️ Customer for <b>{customerSince}</b></span>
            <span>• Last contact: <b>{client.lastContact}</b></span>
          </div>
        </div>
        {/* Quick Actions Panel */}
        <div className="flex gap-2 md:gap-4">
          <button
            className="flex items-center gap-1 bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] font-bold px-4 py-2 rounded-lg shadow-sm transition"
            onClick={() => alert("Calling client... (demo)")}
          >
            <Phone size={18} /> Call
          </button>
          <button
            className="flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-4 py-2 rounded-lg shadow-sm transition"
            onClick={() => setShowSms(true)}
          >
            <MessageCircle size={18} /> Text
          </button>
          <button
            className="flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-800 font-bold px-4 py-2 rounded-lg shadow-sm transition"
            onClick={() => setShowEmail(true)}
          >
            <Mail size={18} /> Email
          </button>
          <button
            className="flex items-center gap-1 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold px-4 py-2 rounded-lg shadow-sm transition"
            onClick={() => setShowSchedule(true)}
          >
            <CalendarClock size={18} /> Schedule Review
          </button
