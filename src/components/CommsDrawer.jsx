// src/components/CommsDrawer.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { listCommsAll } from "../api";
import { X, Phone, MessageCircle, Mail, CalendarClock, Download } from "lucide-react";

export default function CommsDrawer({ clientId, onClose }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState("sms"); // sms | email | call | appointment

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const data = await listCommsAll(clientId);
        if (live) setRows(data);
      } catch {}
    }
    if (clientId) load();
    return () => { live = false; };
  }, [clientId]);

  const filtered = useMemo(() => rows.filter(r => r.type === tab), [rows, tab]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}/>
      <div className="absolute right-0 top-0 h-full w-full md:w-[720px] bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="text-lg font-bold">{t('allCommunication')}</div>
          <button className="text-slate-500 hover:text-slate-700" onClick={onClose} title={t('close')}>
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b flex gap-2 text-sm">
          <TabBtn active={tab==="sms"} onClick={()=>setTab("sms")} icon={<MessageCircle size={14}/>}>{t('texts')}</TabBtn>
          <TabBtn active={tab==="email"} onClick={()=>setTab("email")} icon={<Mail size={14}/>}>{t('emails')}</TabBtn>
          <TabBtn active={tab==="call"} onClick={()=>setTab("call")} icon={<Phone size={14}/>}>{t('calls')}</TabBtn>
          <TabBtn active={tab==="appointment"} onClick={()=>setTab("appointment")} icon={<CalendarClock size={14}/>}>{t('appointments')}</TabBtn>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {filtered.length === 0 ? (
            <div className="text-sm text-slate-500">{t('noEntriesYet')}</div>
          ) : (
            <div className="space-y-3">
              {filtered.map(item => (
                <Entry key={item.id} item={item} t={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded border ${active ? "bg-slate-900 text-white" : "bg-white hover:bg-gray-50"}`}
    >
      <span className="inline-flex items-center gap-1">{icon}{children}</span>
    </button>
  );
}

function Entry({ item, t }) {
  const Icon = item.type === "sms" ? MessageCircle : item.type === "email" ? Mail : item.type === "call" ? Phone : CalendarClock;
  const who = item.direction === "in" ? t('clientToYou') : t('youToClient');
  const when = formatDate(item.at);

  // Optional: show call recording link / duration if present
  const hasRecording = item?.meta?.recordingUrl;
  const duration = item?.meta?.duration;

  return (
    <div className="border rounded p-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold inline-flex items-center gap-2">
          <Icon size={16} /> {capitalize(item.type)} <span className="text-slate-400 text-xs">({who})</span>
        </div>
        <div className="text-xs text-slate-500">{when}</div>
      </div>
      {item.subject ? <div className="text-sm text-slate-700 mt-1"><b>{t('subjectLabel')}</b> {item.subject}</div> : null}
      {item.preview ? <div className="text-sm text-slate-700 mt-1"><b>{t('previewLabel')}</b> {item.preview}</div> : null}

      {item.type === "call" && (hasRecording || duration) && (
        <div className="mt-2 flex items-center gap-3 text-sm">
          {duration ? <span>{t('duration')}: {duration}</span> : null}
          {hasRecording ? (
            <a href={item.meta.recordingUrl} className="inline-flex items-center gap-1 px-2 py-1 rounded border hover:bg-gray-50" target="_blank" rel="noreferrer">
              <Download size={14}/> {t('download')}
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}
function capitalize(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
