// /frontend/src/components/MessageThread.jsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { addComm } from "../api";

const AGENT = "agent";
const CLIENT = "client";

const MessageThread = ({ channel, thread, onClose, unread = 0, clientName, clientId }) => {
  const { t } = useTranslation();
  const CHANNEL_LABELS = { sms: t('smsText'), email: t('email') };

  const [messages, setMessages] = useState(thread);
  const [msg, setMsg] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!msg.trim()) return;

    setSending(true);
    try {
      // Send via backend API (will actually send SMS/Email!)
      await addComm(clientId, {
        type: channel, // 'sms' or 'email'
        subject: channel === 'email' ? subject : '',
        body: msg,
        direction: 'out'
      });

      // Add to local messages for immediate UI feedback
      setMessages([...messages, { from: AGENT, text: msg, date: new Date().toISOString(), read: true }]);
      setMsg("");
      setSubject("");

      alert(`✅ ${channel === 'sms' ? t('smsSentSuccess') : t('emailSentSuccess')}`);
    } catch (error) {
      console.error('Send error:', error);
      alert(`❌ ${t('failedToSend')} ${channel}: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex gap-2 items-center">
            {channel === "sms" ? "📲" : "📧"}
            <span className="font-bold">{CHANNEL_LABELS[channel]}</span>
            <span className="ml-2 text-gray-500 text-sm">{clientName}</span>
            {unread > 0 && (
              <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">{unread} {t('unread')}</span>
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
        <div className="p-3 border-t bg-white">
          {channel === 'email' && (
            <input
              className="w-full rounded-xl border px-3 py-2 mb-2"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={t('subject') + "..."}
            />
          )}
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border px-3 py-2"
              value={msg}
              onChange={e => setMsg(e.target.value)}
              placeholder={t('message') + "..."}
              onKeyDown={e => e.key === "Enter" && !sending && handleSend()}
              disabled={sending}
            />
            <button
              className="rounded-xl bg-[#FFB800] text-[#172A3A] font-bold px-4 py-2 disabled:opacity-50"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? '...' : (channel === "sms" ? `📲 ${t('send')}` : `📧 ${t('send')}`)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageThread;
