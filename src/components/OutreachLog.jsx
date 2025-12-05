// src/components/OutreachLog.jsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { addOutreach, listOutreach, deleteOutreach } from "../api";
import { Phone, MessageCircle, Mail, StickyNote, Trash2 } from "lucide-react";

export default function OutreachLog({ clientId }) {
  const { t } = useTranslation();

  const TYPE_OPTS = [
    { value: "call",  label: t('call'),  Icon: Phone,        color: "text-green-600" },
    { value: "sms",   label: t('sms'),   Icon: MessageCircle, color: "text-blue-500"  },
    { value: "email", label: t('email'), Icon: Mail,          color: "text-purple-600"},
    { value: "note",  label: t('note'),  Icon: StickyNote,    color: "text-slate-600" },
  ];

  const [rows, setRows] = useState([]);
  const [type, setType] = useState("call");
  const [subject, setSubject] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const data = await listOutreach(clientId);
        if (live) setRows(data);
      } catch (e) { /* ignore */ }
    }
    if (clientId) load();
    return () => { live = false; };
  }, [clientId]);

  async function onAdd(e) {
    e.preventDefault();
    setErr("");
    if (!subject && !note) { setErr(t('enterSubjectOrNote')); return; }
    try {
      setSaving(true);
      const created = await addOutreach(clientId, { type, subject, note });
      setRows(prev => [created, ...prev]);
      setSubject(""); setNote("");
    } catch (e) {
      setErr(t('failedToSaveOutreach'));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    if (!confirm(t('deleteEntryConfirm'))) return;
    try {
      await deleteOutreach(clientId, id);
      setRows(prev => prev.filter(r => r.id !== id));
    } catch { /* ignore */ }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-lg font-bold text-[#172A3A]">{t('outreachLog')}</div>
          <div className="text-sm text-slate-500">{t('outreachLogSubtitle')}</div>
        </div>
      </div>

      <form onSubmit={onAdd} className="grid md:grid-cols-4 gap-3 mb-4">
        <select className="border rounded px-3 py-2" value={type} onChange={(e)=>setType(e.target.value)}>
          {TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input className="border rounded px-3 py-2 md:col-span-1" placeholder={t('subjectOptional')} value={subject} onChange={e=>setSubject(e.target.value)} />
        <input className="border rounded px-3 py-2 md:col-span-2" placeholder={t('notes')} value={note} onChange={e=>setNote(e.target.value)} />
        {err && <div className="md:col-span-4 text-sm text-red-600">{err}</div>}
        <div className="md:col-span-4 flex justify-end">
          <button className="px-4 py-2 rounded bg-slate-900 text-white hover:opacity-95 disabled:opacity-60" disabled={saving}>
            {saving ? t('saving') : t('addEntry')}
          </button>
        </div>
      </form>

      {rows.length === 0 ? (
        <div className="text-sm text-slate-500">{t('noOutreachYet')}</div>
      ) : (
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <Th>{t('when')}</Th>
                <Th>{t('type')}</Th>
                <Th>{t('subject')}</Th>
                <Th>{t('notes')}</Th>
                <Th>{t('actions')}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const meta = TYPE_OPTS.find(t => t.value === r.type) || TYPE_OPTS[0];
                const Icon = meta.Icon;
                return (
                  <tr key={r.id} className="odd:bg-white even:bg-slate-50/50">
                    <Td>{formatDate(r.at)}</Td>
                    <Td><span className={`inline-flex items-center gap-1 ${meta.color}`}><Icon size={14}/>{meta.label}</span></Td>
                    <Td>{r.subject || "—"}</Td>
                    <Td>{r.note || "—"}</Td>
                    <Td>
                      <button onClick={()=>onDelete(r.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded border text-red-600 hover:bg-red-50">
                        <Trash2 size={14}/> {t('delete')}
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const Th = ({ children }) => <th className="text-left px-3 py-2 border-b">{children}</th>;
const Td = ({ children }) => <td className="px-3 py-2 border-b">{children}</td>;

function formatDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}
