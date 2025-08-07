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

const ClientProfile = () => {
  const [showSms, setShowSms] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  // Calculate "Customer For" time
  const customerSince = (() => {
    const start = new Date(MOCK_CLIENT.effectiveDate);
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear();
    const months = now.getMonth() - start.getMonth() + (years * 12);
    const yearsPart = Math.floor(months / 12);
    const monthsPart = months % 12;
    return `${yearsPart} year${yearsPart !== 1 ? "s" : ""}, ${monthsPart} month${monthsPart !== 1 ? "s" : ""}`;
  })();

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 font-[Inter]">
      {/* Header: Name, Risk, Take Action */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-10 mb-10">
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-extrabold text-[#172A3A]">{MOCK_CLIENT.name}</h1>
          </div>
          <div className="flex gap-8 mt-2 text-gray-600 text-lg">
            <span>🗓️ Customer for <b>{customerSince}</b></span>
            <span>📞 Last contact: <b>{MOCK_CLIENT.lastContact}</b></span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <ClientRiskChart score={MOCK_CLIENT.riskScore} />
          <TakeActionMenu
            smsUnread={MOCK_CLIENT.smsUnread}
            emailUnread={MOCK_CLIENT.emailUnread}
            onSms={() => setShowSms(true)}
            onEmail={() => setShowEmail(true)}
            onCall={() => alert("Calling client... (demo)")}
            onSchedule={() => setShowSchedule(true)}
          />
        </div>
      </div>

      {/* All client details & uploads */}
      <ClientDetailCard client={MOCK_CLIENT} />

      {/* Outreach Log */}
      <div className="mt-10">
        <OutreachLog outreach={MOCK_CLIENT.outreach} />
      </div>

      {/* Modals */}
      {showSms && (
        <MessageThread
          channel="sms"
          thread={MOCK_CLIENT.messages.sms}
          onClose={() => setShowSms(false)}
          unread={MOCK_CLIENT.smsUnread}
          clientName={MOCK_CLIENT.name}
        />
      )}
      {showEmail && (
        <MessageThread
          channel="email"
          thread={MOCK_CLIENT.messages.email}
          onClose={() => setShowEmail(false)}
          unread={MOCK_CLIENT.emailUnread}
          clientName={MOCK_CLIENT.name}
        />
      )}
      {showSchedule && (
        <ClientScheduleModal onClose={() => setShowSchedule(false)} client={MOCK_CLIENT} />
      )}
    </div>
  );
};

export default ClientProfile;
