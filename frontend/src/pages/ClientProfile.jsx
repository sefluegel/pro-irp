// /frontend/src/pages/ClientProfile.jsx
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ClientRiskChart from "../components/ClientRiskChart";
import TakeActionMenu from "../components/TakeActionMenu";
import OutreachLog from "../components/OutreachLog";
import MessageThread from "../components/MessageThread";
import ClientScheduleModal from "../components/ClientScheduleModal";
import ClientDetailCard from "../components/ClientDetailCard";

// You do NOT need to define MOCK_CLIENT here anymore!
// The actual client list is passed as a prop from App.jsx

const ClientProfile = ({ clients }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Find client by id (convert id to string for safety)
  const client = clients.find(c => String(c.id) === String(id));

  // Show a "not found" screen if id doesn't match
  if (!client) {
    return (
      <div className="p-12 text-2xl">
        Client not found.
        <button className="text-blue-700 underline ml-2" onClick={() => navigate("/clients")}>
          Back to Clients
        </button>
      </div>
    );
  }

  // UI state for modals (unchanged)
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

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 font-[Inter]">
      {/* Header: Name, Risk, Take Action */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-10 mb-10">
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-extrabold text-[#172A3A]">{client.name}</h1>
          </div>
          <div className="flex gap-8 mt-2 text-gray-600 text-lg">
            <span>🗓️ Customer for <b>{customerSince}</b></span>
            <span>📞 Last contact: <b>{client.lastContact}</b></span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <ClientRiskChart score={client.riskScore} />
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

      {/* All client details & uploads */}
      <ClientDetailCard client={client} />

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
