// /frontend/src/pages/ClientProfile.jsx
import React, { useState } from "react";
import ClientRiskChart from "../components/ClientRiskChart";
import TakeActionMenu from "../components/TakeActionMenu";
import OutreachLog from "../components/OutreachLog";
import MessageThread from "../components/MessageThread";
import ClientScheduleModal from "../components/ClientScheduleModal";
import ClientDetailCard from "../components/ClientDetailCard";

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

const ClientProfile = () => {
  // For demo, editable fields are local only (no backend)
  const [client, setClient] = useState(MOCK_CLIENT);

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

  // --- Demo data for retention breakdown, tasks, communication ---
  const riskBreakdown = {
    summary: "Client risk score is high due to multiple major triggers. Immediate attention recommended.",
    flags: [
      {
        title: "Added Tier 4 Medication",
        date: "2025-07-05",
        desc: "Jardiance prescribed on 07/05/2025 (Tier 4 drug)."
      },
      {
        title: "No contact in 264 days",
        date: "2024-11-15",
        desc: "Last contact was over 8 months ago."
      },
      {
        title: "Doctor leaving network",
        date: "2025-08-01",
        desc: "Primary care Dr. Bob Smith is leaving network next month."
      }
    ]
  };

  const communications = [
    {
      icon: "💬",
      desc: "Check-in text sent (high risk: new medication)",
      date: "2025-07-06 09:12",
      type: "sms",
      view: true
    },
    {
      icon: "📧",
      desc: "Provider network change alert email sent",
      date: "2025-07-07 15:22",
      type: "email",
      view: true
    },
    {
      icon: "📰",
      desc: "Monthly health newsletter sent",
      date: "2025-07-10 08:00",
      type: "email",
      view: true
    }
  ];

  const tasks = [
    {
      icon: "📞",
      label: "Check-in call (Tier 4 med)",
      due: "Today",
      action: () => alert("Dialing out..."),
      status: "Complete"
    },
    {
      icon: "💬",
      label: "Send 'Provider change' text",
      due: "Tomorrow",
      action: () => alert("Opening SMS..."),
      status: "Complete"
    },
    {
      icon: "📅",
      label: "Schedule policy review",
      due: "Due in 3 days",
      action: () => alert("Opening scheduling..."),
      status: "Complete"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 font-[Inter]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#172A3A] mb-1">
            {client.name}
          </h1>
          <div className="flex flex-wrap gap-x-7 gap-y-2 items-center text-[#536179] text-[15px] md:text-base font-medium">
            <span>🗓️ Customer for <b>{customerSince}</b></span>
            <span>• Last contact: <b>{client.lastContact}</b></span>
          </div>
        </div>
      </div>

      {/* Main 3-up grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Retention Risk Box */}
        <div className="bg-white rounded-2xl shadow border p-6 flex flex-col">
          {/* Only show chart w/ label and score */}
          <ClientRiskChart score={client.riskScore} size={85} />
          <div className="mt-5 text-sm">
            <div>{riskBreakdown.summary}</div>
            {/* Flags */}
            <div className="mt-3">
              <div className="font-bold text-red-600 mb-1">Red Flags:</div>
              <ul className="space-y-1">
                {riskBreakdown.flags.map(flag => (
                  <li key={flag.title} className="flex items-start gap-2">
                    <span className="text-red-600">•</span>
                    <div>
                      <span className="font-bold">{flag.title}</span>
                      <span className="ml-2 text-gray-500 text-xs">({flag.date})</span>
                      <div className="text-gray-600 text-xs">{flag.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Recent Communication */}
        <div className="bg-white rounded-2xl shadow border p-6 flex flex-col">
          <div className="font-bold text-[#172A3A] mb-2">Recent Communication</div>
          <ul className="space-y-3 text-sm">
            {communications.map((com, idx) => (
              <li key={idx} className="flex items-center justify-between">
                <div>
                  <span>{com.icon}</span>{" "}
                  <span>{com.desc}</span>
                  <span className="ml-2 text-gray-400 text-xs">{com.date}</span>
                </div>
                {com.view && (
                  <button className="ml-4 text-blue-600 text-xs font-semibold hover:underline">
                    View
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Tasks Due */}
        <div className="bg-white rounded-2xl shadow border p-6 flex flex-col">
          <div className="font-bold text-[#172A3A] mb-2">Tasks Due</div>
          <ul className="space-y-3 text-sm">
            {tasks.map((task, idx) => (
              <li key={idx} className="flex items-center justify-between">
                <div>
                  <span>{task.icon}</span>{" "}
                  <span>{task.label}</span>
                  <span className="ml-2 text-gray-400 text-xs">{task.due}</span>
                </div>
                <button className="ml-4 text-blue-600 text-xs font-semibold hover:underline" onClick={task.action}>
                  Complete
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Detail Card fills lower half */}
      <ClientDetailCard client={client} />

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
