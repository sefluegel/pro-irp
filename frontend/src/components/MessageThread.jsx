// /frontend/src/components/MessageThread.jsx
import React, { useState } from "react";

const AGENT = "agent";
const CLIENT = "client";
const CHANNEL_LABELS = { sms: "SMS Text", email: "Email" };

const MessageThread = ({ channel, thread, onClose, unread = 0, clientName }) => {
  const [messages, setMessages] = useState(thread);
  const [msg, setMsg] = useState("");

  const handleSend = () => {
    if (!msg.trim()) return;
    setMessages([...messages, { from: AGENT, text: msg, date: new Date().toISOString(), read: true }]);
    setMsg("");
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex gap-2 items-center">
            {channel === "sms" ? "📲" : "📧"}
            <span className="font-bold">{CHANNEL_LABELS[channel]}</span>
            <span className="ml-2 text-gray-500 text-sm">with {clientName}</span>
            {unread > 0 && (
              <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">{unread} unread</span>
            )}
          </div>
          <button className="text-xl" onClick={onClose}>✖️</button>
        </div>
        {/* Thread */}
        <div className="flex-1 overflow-y-auto px-3 py-4 bg-[#F5F6FA]">
          {messages.map((m, i) => (
            <div key={i} className={`flex mb-3 ${m.from === AGENT ? "justify-end" : "justify-start"}`}>
              <div className={`rounded-2xl px-4 py-2 max-w-[72%] text-base shadow-sm 
                ${m.from === AGENT
                  ? "bg-[#FFB800] text-[#172A3A] rounded-br-lg"
                  : "bg-[#e5e7eb] text-gray-800 rounded-bl-lg"
                }`}>
                {m.text}
                <div className="text-xs mt-1 text-gray-500 text-right">
                  {new Date(m.date).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Compose */}
        <div className="p-3 border-t flex gap-2 bg-white">
          <input
            className="flex-1 rounded-xl border px-3 py-2"
            value={msg}
            onChange={e => setMsg(e.target.value)}
            placeholder={`Type a message...`}
            onKeyDown={e => e.key === "Enter" && handleSend()}
          />
          <button
            className="rounded-xl bg-[#FFB800] text-[#172A3A] font-bold px-4 py-2"
            onClick={handleSend}
          >
            {channel === "sms" ? "📲 Send" : "📧 Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageThread;
