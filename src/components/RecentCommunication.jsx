// src/components/RecentCommunication.jsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { listComms } from "../api";
import { Phone, MessageCircle, Mail, CalendarClock, ArrowRight, ArrowUpRight, ArrowDownLeft } from "lucide-react";

const ICONS = {
  sms: MessageCircle,
  email: Mail,
  call: Phone,
  appointment: CalendarClock
};

const COLORS = {
  sms: 'text-blue-500',
  email: 'text-purple-500',
  call: 'text-green-500',
  appointment: 'text-orange-500'
};

export default function RecentCommunication({ clientId, onViewAll }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const data = await listComms(clientId, 4);
        if (live) setRows(data);
      } catch { /* ignore */ }
    }
    if (clientId) load();
    return () => { live = false; };
  }, [clientId]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl transition-shadow">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-[#172A3A] flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
              <MessageCircle size={18} />
            </span>
            {t('recentCommunication')}
          </h3>
          <button
            className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1 hover:underline"
            onClick={onViewAll}
          >
            {t('viewAll')} <ArrowRight size={14}/>
          </button>
        </div>
      </div>

      <div className="p-4">
        {rows.length === 0 ? (
          <div className="text-center py-4 text-slate-400 text-sm">
            {t('noRecentCommunication')}
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const Icon = ICONS[r.type] || MessageCircle;
              const color = COLORS[r.type] || COLORS.sms;
              const isInbound = r.direction === "in";

              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Icon className={color} size={16} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-700 truncate block">
                      {r.subject || r.preview || "No subject"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                    {isInbound ? (
                      <ArrowDownLeft size={12} className="text-green-500" />
                    ) : (
                      <ArrowUpRight size={12} className="text-blue-500" />
                    )}
                    <span>{formatDate(r.at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}
