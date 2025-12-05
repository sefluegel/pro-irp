// /frontend/src/pages/AEPWizard.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Zap, CalendarDays, Send, Eye, MessageSquare, AlertCircle, XCircle,
  CheckCircle2, Plus, Edit2, Download, RefreshCw, Star, Eye as EyeIcon,
  ListChecks, PhoneCall, Mail, Calendar, UserPlus, User, Filter, ArrowUpRight,
  HelpCircle, Trash2, Save
} from "lucide-react";
import {
  getAepTemplates, createAepTemplate, updateAepTemplate, deleteAepTemplate,
  getAepAutomations, updateAepAutomations,
  getAepCountdownContacts, addAepCountdownContact, updateAepCountdownContact, deleteAepCountdownContact, sendAepDrip,
  getAepActivity, resendAepActivity,
  getAepAnalytics, getAepMergeTags
} from "../api";

/**
 * AEP WIZARD – Connected to real backend
 */

/* -------------------- helpers -------------------- */

function getNextOct15(now = new Date()) {
  const year = now.getMonth() > 9 || (now.getMonth() === 9 && now.getDate() > 15)
    ? now.getFullYear() + 1
    : now.getFullYear();
  return new Date(year, 9, 15, 0, 0, 0, 0);
}

function breakdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSeconds / (60 * 60 * 24));
  const h = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const m = Math.floor((totalSeconds % (60 * 60)) / 60);
  const s = totalSeconds % 60;
  return { d, h, m, s };
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return d.toLocaleDateString();
}

/* -------------------- component -------------------- */

export default function AEPWizard() {
  const { t } = useTranslation();
  const [showSplash, setShowSplash] = useState(true);
  const [now, setNow] = useState(new Date());
  const target = useMemo(() => getNextOct15(now), [now]);

  // Data from API
  const [templates, setTemplates] = useState([]);
  const [activity, setActivity] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [mergeTags, setMergeTags] = useState([]);
  const [automations, setAutomations] = useState({
    preAEP60: true, preAEP30: true, preAEP14: true, preAEP7: true,
    preAEP3: true, preAEP1: true, anocExplainer: true, bookingNudges: true,
    voicemailDropUI: false, requireApproval: false,
  });

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // UI state
  const [searchTemplate, setSearchTemplate] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { sender: "ai", text: t('askAboutAutomations') || "Ask me to draft AEP messages, suggest subject lines, or explain automations!" },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Splash auto-transition
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Live clock for countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = breakdown(target.getTime() - now.getTime());

  // Load data from API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [templatesRes, automationsRes, contactsRes, activityRes, analyticsRes, mergeTagsRes] = await Promise.all([
        getAepTemplates().catch(() => ({ data: [] })),
        getAepAutomations().catch(() => ({ data: {} })),
        getAepCountdownContacts().catch(() => ({ data: [] })),
        getAepActivity({ limit: 50 }).catch(() => ({ data: [] })),
        getAepAnalytics({ days: 30 }).catch(() => ({ data: [] })),
        getAepMergeTags().catch(() => ({ data: [] })),
      ]);

      if (templatesRes.data) setTemplates(templatesRes.data);
      if (automationsRes.data) setAutomations(prev => ({ ...prev, ...automationsRes.data }));
      if (contactsRes.data) setContacts(contactsRes.data);
      if (activityRes.data) setActivity(activityRes.data);
      if (analyticsRes.data) setAnalytics(analyticsRes.data);
      if (mergeTagsRes.data) setMergeTags(mergeTagsRes.data);
    } catch (err) {
      console.error('Load AEP data error:', err);
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* -------- AI helper (stub) -------- */
  function handleAiSend(e) {
    e.preventDefault();
    if (!aiInput.trim()) return;
    setAiMessages((prev) => [...prev, { sender: "user", text: aiInput }]);
    const input = aiInput;
    setAiInput("");
    setTimeout(() => {
      setAiMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: input.toLowerCase().includes("subject")
            ? 'Try: "AEP starts soon - Let\'s lock your review."'
            : "Here's a clean, compliant draft:\n\nHi {ClientName}, AEP starts on Oct 15. Would you like to schedule a quick review? - {AgentName}",
        },
      ]);
    }, 700);
  }

  /* -------- Automations -------- */
  async function toggleAuto(key) {
    const newValue = !automations[key];
    setAutomations((a) => ({ ...a, [key]: newValue }));
    try {
      await updateAepAutomations({ ...automations, [key]: newValue });
    } catch (err) {
      console.error('Toggle automation error:', err);
      setAutomations((a) => ({ ...a, [key]: !newValue })); // revert
    }
  }

  /* -------- Activity actions -------- */
  async function handleResend(idx) {
    const item = activity[idx];
    if (!item?.id) return;
    try {
      await resendAepActivity(item.id);
      setActivity((prev) =>
        prev.map((a, i) => (i === idx ? { ...a, status: "resent", error: undefined } : a))
      );
    } catch (err) {
      console.error('Resend error:', err);
    }
  }

  function handleExportCSV() {
    const csv = activity.map(a =>
      `${a.time},${a.type},${a.to},${a.subject},${a.status},${a.automation || ''}`
    ).join('\n');
    const blob = new Blob(['Time,Type,To,Subject,Status,Automation\n' + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'aep-activity.csv';
    link.click();
  }

  /* -------- Templates -------- */
  function handlePreviewTemplate(tpl) {
    setPreviewTemplate(tpl);
  }

  function handleEditTemplate(tpl) {
    setEditingTemplate({
      id: tpl.id,
      title: tpl.title,
      type: tpl.type,
      subject: tpl.subject || '',
      content: tpl.content,
      tags: tpl.tags || [],
      is_system: tpl.is_system,
    });
  }

  async function handleSaveTemplate(e) {
    e.preventDefault();
    if (!editingTemplate) return;

    setSaving(true);
    try {
      if (editingTemplate.id) {
        const res = await updateAepTemplate(editingTemplate.id, editingTemplate);
        if (res.data) {
          setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? res.data : t));
          // If it was a system template copy, add the new one
          if (res.message?.includes('copy')) {
            setTemplates(prev => [...prev, res.data]);
          }
        }
      } else {
        const res = await createAepTemplate(editingTemplate);
        if (res.data) {
          setTemplates(prev => [...prev, res.data]);
        }
      }
      setEditingTemplate(null);
    } catch (err) {
      console.error('Save template error:', err);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTemplate(tpl) {
    if (tpl.is_system) {
      alert('Cannot delete system templates');
      return;
    }
    if (!window.confirm(`Delete template "${tpl.title}"?`)) return;

    try {
      await deleteAepTemplate(tpl.id);
      setTemplates(prev => prev.filter(t => t.id !== tpl.id));
    } catch (err) {
      console.error('Delete template error:', err);
      alert('Failed to delete template');
    }
  }

  function handleInsertTemplate(tpl) {
    setPreviewTemplate(null);
    alert("Template content copied! You can paste it into your email composer or automation workflow.");
    navigator.clipboard?.writeText(tpl.content);
  }

  function handleTestSend(content) {
    let rendered = content;
    mergeTags.forEach(tag => {
      rendered = rendered.replace(new RegExp(tag.tag.replace(/[{}]/g, '\\$&'), 'g'), tag.description || tag.key);
    });
    alert("Test preview (with sample data):\n\n" + rendered);
  }

  /* -------- Countdown List (contacts) -------- */
  function openAdd() {
    setEditing(null);
    setAddOpen(true);
  }

  async function saveContact(e) {
    e.preventDefault();
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      firstName: form.get("firstName")?.trim() || "",
      lastName: form.get("lastName")?.trim() || "",
      phone: form.get("phone")?.trim() || "",
      email: form.get("email")?.trim() || "",
      zip: form.get("zip")?.trim() || "",
      county: form.get("county")?.trim() || "",
      dob: form.get("dob") || "",
      language: form.get("language") || "English",
      source: form.get("source") || "Other",
      notes: form.get("notes") || "",
      permissionToContact: form.get("ptc") === "on",
      status: form.get("status") || "New",
      newsletter: form.get("newsletter") === "on",
      outreachPlan: {
        twoMonths: form.get("twoMonths") === "on",
        oneMonth: form.get("oneMonth") === "on",
        twoWeeks: form.get("twoWeeks") === "on",
        oneWeek: form.get("oneWeek") === "on",
        aepLive: form.get("aepLive") === "on",
      },
    };

    try {
      if (editing) {
        await updateAepCountdownContact(editing.id, payload);
        setContacts(prev => prev.map(c => c.id === editing.id ? { ...c, ...payload } : c));
      } else {
        const res = await addAepCountdownContact(payload);
        if (res.data) {
          setContacts(prev => [{ ...payload, id: res.data.id, history: [] }, ...prev]);
        }
      }
      setAddOpen(false);
    } catch (err) {
      console.error('Save contact error:', err);
      alert('Failed to save contact');
    } finally {
      setSaving(false);
    }
  }

  function editContact(c) {
    setEditing(c);
    setAddOpen(true);
  }

  async function handleDeleteContact(c) {
    if (!window.confirm(`Delete ${c.firstName} ${c.lastName}?`)) return;
    try {
      await deleteAepCountdownContact(c.id);
      setContacts(prev => prev.filter(x => x.id !== c.id));
    } catch (err) {
      console.error('Delete contact error:', err);
    }
  }

  async function sendNextDrip(c) {
    try {
      await sendAepDrip(c.id, { channel: 'email' });
      setContacts(prev =>
        prev.map(x =>
          x.id === c.id
            ? {
                ...x,
                status: x.status === "New" ? "Warm" : x.status,
                history: [...(x.history || []), { date: new Date().toISOString().slice(0, 10), channel: "Email", subject: "Pre-AEP reminder", status: "queued" }],
              }
            : x
        )
      );
      alert(`Queued drip to ${c.firstName} ${c.lastName}`);
      loadData(); // Refresh activity
    } catch (err) {
      console.error('Send drip error:', err);
      alert('Failed to send drip');
    }
  }

  /* -------------------- UI -------------------- */

  if (loading && templates.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-blue-100">
        <div className="text-center">
          <Zap className="w-12 h-12 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-blue-900 font-semibold">Loading AEP Wizard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100">
      {/* Splash with countdown */}
      {showSplash && (
        <SplashCountdown remaining={remaining} onSkip={() => setShowSplash(false)} t={t} />
      )}

      {/* HEADER */}
      <div className="sticky top-0 z-20 flex items-center justify-between p-6 border-b bg-white/70 backdrop-blur">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-blue-800" />
          <h1 className="text-3xl font-black tracking-tight text-blue-900">{t('aepWizardTitle') || 'AEP Wizard'}</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="w-5 h-5 text-blue-700" />
          <span className="font-semibold text-blue-900">
            {t('aepStartsIn') || 'AEP starts in'} {remaining.d}d {remaining.h}h {remaining.m}m {remaining.s}s
          </span>
          <button
            className="ml-4 bg-white border border-blue-200 text-blue-900 px-3 py-1.5 rounded-xl font-semibold hover:bg-blue-50"
            onClick={() => setHelpOpen(true)}
          >
            <HelpCircle className="inline-block -mt-0.5 mr-1" size={16} />
            {t('help') || 'Help'}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* HELP modal */}
      {helpOpen && (
        <Modal onClose={() => setHelpOpen(false)} title={t('usingAepWizard') || 'Using AEP Wizard'}>
          <ul className="space-y-2 text-gray-700">
            <li>• Use Quick Actions to send pre-AEP blasts or open booking</li>
            <li>• Automations control which drip campaigns run automatically</li>
            <li>• Templates can be customized with merge tags like <code className="bg-blue-100 px-1 rounded">{'{ClientName}'}</code></li>
            <li>• Countdown List stores year-round prospects who need to wait for AEP</li>
            <li>• AI Helper can draft compliant messages for you</li>
          </ul>
        </Modal>
      )}

      {/* BODY */}
      <div className="px-6 py-8 grid grid-cols-1 2xl:grid-cols-5 gap-6">
        {/* Left: Hero + Automations */}
        <div className="2xl:col-span-3 flex flex-col gap-6">
          {/* HERO */}
          <section className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 text-white rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="text-sm opacity-90">{t('eventMode') || 'Event Mode'}</div>
                <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight">{t('letsWinAEP') || "Let's Win AEP"}</h2>
                <p className="mt-1 text-blue-100">
                  {t('focusedOutreach') || 'Focused outreach + automation = more enrollments'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="bg-white text-blue-800 px-4 py-2 rounded-xl font-bold shadow hover:scale-105 transition">
                  <Send className="inline -mt-1 mr-1" size={16} />
                  {t('sendPreAepBlast') || 'Send Pre-AEP Blast'}
                </button>
                <button className="bg-white/10 border border-white/30 text-white px-4 py-2 rounded-xl font-bold hover:bg-white/20 transition">
                  <Calendar className="inline -mt-1 mr-1" size={16} />
                  {t('openBooking') || 'Open Booking'}
                </button>
                <button className="bg-white/10 border border-white/30 text-white px-4 py-2 rounded-xl font-bold hover:bg-white/20 transition">
                  <ListChecks className="inline -mt-1 mr-1" size={16} />
                  {t('createCallList') || 'Create Call List'}
                </button>
              </div>
            </div>
            {/* Progress tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <ProgressTile label={t('preAepOutreach') || 'Pre-AEP Outreach'} value={72} />
              <ProgressTile label={t('bookingGoal') || 'Booking Goal'} value={54} />
              <ProgressTile label={t('riskCoverage') || 'Risk Coverage'} value={63} />
              <ProgressTile label={t('repliesHandled') || 'Replies Handled'} value={39} />
            </div>
          </section>

          {/* AUTOMATIONS */}
          <section className="bg-white rounded-3xl shadow p-6 border border-blue-100">
            <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
              <Zap className="text-blue-700" /> {t('outreachAutomations') || 'Outreach Automations'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[
                ["preAEP60", t('preAep60Days') || "60-Day Pre-AEP Email"],
                ["preAEP30", t('preAep30Days') || "30-Day Pre-AEP Email"],
                ["preAEP14", t('preAep14Days') || "14-Day Pre-AEP Email"],
                ["preAEP7", t('preAep7Days') || "7-Day Pre-AEP SMS"],
                ["preAEP3", t('preAep3Days') || "3-Day Reminder"],
                ["preAEP1", t('preAep1Day') || "1-Day Final Push"],
                ["anocExplainer", t('anocExplainer') || "ANOC Explainer"],
                ["bookingNudges", t('bookingNudges') || "Booking Nudges"],
              ].map(([key, label]) => (
                <ToggleCard key={key} label={label} on={automations[key]} onClick={() => toggleAuto(key)} />
              ))}
              <ToggleCard
                label={t('voicemailDropUi') || 'Voicemail Drop UI'}
                on={automations.voicemailDropUI}
                onClick={() => toggleAuto("voicemailDropUI")}
              />
              <ToggleCard
                label={t('requireApproval') || 'Require Approval'}
                on={automations.requireApproval}
                onClick={() => toggleAuto("requireApproval")}
              />
            </div>
          </section>

          {/* TEMPLATES */}
          <section className="bg-white rounded-3xl shadow p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                <Star className="text-yellow-500" /> {t('templates') || 'Templates'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingTemplate({ title: '', type: 'email', subject: '', content: '', tags: [] })}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700"
                >
                  <Plus size={14} className="inline -mt-0.5 mr-1" /> New Template
                </button>
                <Filter size={16} className="text-gray-400" />
                <input
                  type="text"
                  className="rounded-lg border px-2 py-1 text-sm"
                  placeholder={t('searchTemplatesPlaceholder') || 'Search...'}
                  value={searchTemplate}
                  onChange={(e) => setSearchTemplate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates
                .filter(
                  (tpl) =>
                    (tpl.title || '').toLowerCase().includes(searchTemplate.toLowerCase()) ||
                    (tpl.tags || []).join(" ").toLowerCase().includes(searchTemplate.toLowerCase())
                )
                .map((tpl) => (
                  <div key={tpl.id} className="p-4 rounded-2xl border hover:border-blue-300 transition bg-blue-50/40">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-bold text-gray-900">
                          {tpl.title} <span className="text-xs text-blue-500">({tpl.type})</span>
                          {tpl.is_system && <span className="text-xs text-gray-400 ml-1">(System)</span>}
                        </div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {(tpl.tags || []).map((tag, j) => (
                            <span key={j} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                              {tag}
                            </span>
                          ))}
                          {tpl.is_featured && (
                            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">{t('featured') || 'Featured'}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="text-blue-700 hover:underline text-xs"
                          onClick={() => handlePreviewTemplate(tpl)}
                        >
                          <EyeIcon size={16} className="inline -mt-0.5 mr-1" />
                          {t('preview') || 'Preview'}
                        </button>
                        <button
                          className="text-green-700 hover:underline text-xs"
                          onClick={() => handleEditTemplate(tpl)}
                        >
                          <Edit2 size={16} className="inline -mt-0.5 mr-1" />
                          {t('edit') || 'Edit'}
                        </button>
                        {!tpl.is_system && (
                          <button
                            className="text-red-600 hover:underline text-xs"
                            onClick={() => handleDeleteTemplate(tpl)}
                          >
                            <Trash2 size={14} className="inline -mt-0.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </div>

        {/* Right: Activity + Analytics + AI */}
        <div className="2xl:col-span-2 flex flex-col gap-6">
          {/* ACTIVITY */}
          <section className="bg-white rounded-3xl shadow p-6 border border-blue-100">
            <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
              <ListChecks className="text-blue-700" /> {t('activityFeed') || 'Activity Feed'}
            </h3>
            <div className="max-h-72 overflow-y-auto divide-y">
              {activity.length === 0 ? (
                <p className="text-gray-500 py-4 text-center">No activity yet. Send your first outreach!</p>
              ) : (
                activity.map((a, idx) => (
                  <div key={a.id || idx} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-gray-800">{a.automation || 'Manual'}</div>
                      <div className="text-xs text-gray-500">
                        {formatTime(a.time)} &bull; {a.type} &bull; {a.to}
                      </div>
                      {a.subject && a.subject !== "—" && <div className="text-xs text-gray-400">{a.subject}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      {(a.status === "delivered" || a.status === "sent") && (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle2 size={16} /> {t('delivered') || 'Delivered'}
                        </span>
                      )}
                      {a.status === "opened" && (
                        <span className="text-blue-600 flex items-center gap-1">
                          <Eye size={16} /> {t('opened') || 'Opened'}
                        </span>
                      )}
                      {a.status === "queued" && (
                        <span className="text-yellow-600 flex items-center gap-1">
                          <RefreshCw size={16} /> Queued
                        </span>
                      )}
                      {a.status === "failed" && (
                        <>
                          <span className="text-red-600 flex items-center gap-1">
                            <XCircle size={16} /> {t('failed') || 'Failed'}
                          </span>
                          <button className="text-blue-700 underline text-xs" onClick={() => handleResend(idx)}>
                            <RefreshCw size={14} className="inline -mt-0.5 mr-1" />
                            {t('resend') || 'Resend'}
                          </button>
                          {a.error && <span className="text-xs text-red-400">{a.error}</span>}
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              className="mt-3 text-xs text-blue-900 flex items-center gap-1 hover:underline"
              onClick={handleExportCSV}
            >
              <Download size={16} /> {t('exportCsv') || 'Export CSV'}
            </button>
          </section>

          {/* ANALYTICS */}
          <section className="bg-white rounded-3xl shadow p-6 border border-blue-100">
            <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
              <Eye className="text-blue-700" /> {t('analytics') || 'Analytics'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(analytics.length > 0 ? analytics : [
                { labelKey: "automationsSent", value: 0 },
                { labelKey: "openRate", value: "0%" },
                { labelKey: "clickRate", value: "0%" },
                { labelKey: "replyRate", value: "0%" },
                { labelKey: "bounces", value: 0 },
                { labelKey: "failedSends", value: 0 },
              ]).map((a, i) => {
                const icons = {
                  automationsSent: <Send className="w-6 h-6" />,
                  openRate: <Eye className="w-6 h-6" />,
                  clickRate: <ArrowUpRight className="w-6 h-6" />,
                  replyRate: <MessageSquare className="w-6 h-6" />,
                  bounces: <AlertCircle className="w-6 h-6" />,
                  failedSends: <XCircle className="w-6 h-6" />,
                };
                return (
                  <div key={i} className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow flex flex-col items-center justify-center p-4 border">
                    <div className="mb-1">{icons[a.labelKey] || <Send className="w-6 h-6" />}</div>
                    <div className="text-xl font-black text-blue-800">{a.value}</div>
                    <div className="text-xs text-gray-600">{t(a.labelKey) || a.labelKey}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* AI CHAT */}
          <div className="relative">
            {aiOpen ? (
              <div className="w-full bg-white shadow-2xl rounded-2xl border border-blue-200 flex flex-col">
                <div className="bg-blue-900 text-white px-4 py-2 rounded-t-2xl flex justify-between items-center">
                  <span className="font-semibold">{t('aepWizardHelper') || 'AEP Wizard Helper'}</span>
                  <button className="text-white text-xl" onClick={() => setAiOpen(false)} title="Close">
                    ×
                  </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 min-h-[220px] max-h-72">
                  {aiMessages.map((m, i) => (
                    <div
                      key={i}
                      className={`mb-3 whitespace-pre-line ${
                        m.sender === "ai" ? "text-blue-900 bg-blue-50 p-2 rounded-xl" : "text-right"
                      }`}
                    >
                      {m.text}
                    </div>
                  ))}
                </div>
                <form className="border-t flex items-center gap-2 p-2" onSubmit={handleAiSend}>
                  <input
                    className="flex-1 rounded-lg border px-3 py-2 text-sm"
                    placeholder={t('askMeToDraft') || 'Ask me to draft a message...'}
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    autoFocus
                  />
                  <button className="bg-blue-700 text-white px-3 py-2 rounded-lg hover:bg-blue-900" type="submit">
                    {t('send') || 'Send'}
                  </button>
                </form>
              </div>
            ) : (
              <button
                className="bg-blue-800 text-white rounded-xl px-4 py-2 shadow-2xl flex items-center gap-2 hover:scale-105 transition"
                onClick={() => setAiOpen(true)}
                title="Open AEP Wizard Helper"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="font-bold">{t('openAiHelper') || 'AI Helper'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* COUNTDOWN LIST */}
      <div className="px-6 pb-10">
        <section className="bg-white rounded-3xl shadow p-6 border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
              <Calendar className="text-blue-700" /> {t('countdownList') || 'Countdown List'}
            </h3>
            <button
              onClick={openAdd}
              className="bg-blue-800 text-white px-4 py-2 rounded-xl font-bold shadow hover:bg-blue-900"
            >
              <UserPlus className="inline -mt-1 mr-1" size={16} />
              {t('addContact') || 'Add Contact'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">{t('name') || 'Name'}</th>
                  <th className="py-2 pr-4">{t('phone') || 'Phone'}</th>
                  <th className="py-2 pr-4">{t('email') || 'Email'}</th>
                  <th className="py-2 pr-4">{t('zip') || 'ZIP'}</th>
                  <th className="py-2 pr-4">{t('status') || 'Status'}</th>
                  <th className="py-2 pr-4">{t('monthlyNewsletterLabel') || 'Newsletter'}</th>
                  <th className="py-2 pr-4">{t('outreachPlan') || 'Outreach Plan'}</th>
                  <th className="py-2 pr-4">{t('actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-semibold text-gray-900">
                      {c.firstName} {c.lastName}
                    </td>
                    <td className="py-2 pr-4">{c.phone}</td>
                    <td className="py-2 pr-4">{c.email}</td>
                    <td className="py-2 pr-4">{c.zip}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          c.status === "New"
                            ? "bg-gray-100 text-gray-700"
                            : c.status === "Warm"
                            ? "bg-yellow-100 text-yellow-800"
                            : c.status === "Scheduled"
                            ? "bg-blue-100 text-blue-800"
                            : c.status === "Enrolled"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{c.newsletter ? (t('yesLabel') || 'Yes') : (t('noLabel') || 'No')}</td>
                    <td className="py-2 pr-4">
                      <div className="text-xs text-gray-600">
                        2mo {c.outreachPlan?.twoMonths ? "•" : "×"} / 1mo {c.outreachPlan?.oneMonth ? "•" : "×"} / 2w{" "}
                        {c.outreachPlan?.twoWeeks ? "•" : "×"} / 1w {c.outreachPlan?.oneWeek ? "•" : "×"} / Live{" "}
                        {c.outreachPlan?.aepLive ? "•" : "×"}
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2">
                        <button
                          className="text-blue-700 text-xs underline"
                          onClick={() => sendNextDrip(c)}
                          title="Send next drip"
                        >
                          {t('sendDrip') || 'Send Drip'}
                        </button>
                        <button
                          className="text-gray-700 text-xs underline"
                          onClick={() => editContact(c)}
                          title="Edit"
                        >
                          {t('edit') || 'Edit'}
                        </button>
                        <button
                          className="text-red-600 text-xs underline"
                          onClick={() => handleDeleteContact(c)}
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {contacts.length === 0 && (
                  <tr>
                    <td className="py-6 text-gray-500" colSpan={8}>
                      {t('noContactsYet') || 'No contacts yet. Add prospects who need to wait for AEP!'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add/Edit contact modal */}
          {addOpen && (
            <Modal onClose={() => setAddOpen(false)} title={editing ? (t('editCountdownContact') || 'Edit Contact') : (t('addCountdownContact') || 'Add Contact')}>
              <form onSubmit={saveContact} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input name="firstName" label={t('firstName') || 'First Name'} defaultValue={editing?.firstName} required />
                  <Input name="lastName" label={t('lastName') || 'Last Name'} defaultValue={editing?.lastName} required />
                  <Input name="phone" label={t('phone') || 'Phone'} defaultValue={editing?.phone} />
                  <Input name="email" label={t('email') || 'Email'} defaultValue={editing?.email} />
                  <Input name="zip" label={t('zip') || 'ZIP'} defaultValue={editing?.zip} />
                  <Input name="county" label={t('county') || 'County'} defaultValue={editing?.county} />
                  <Input name="dob" type="date" label={t('dob') || 'Date of Birth'} defaultValue={editing?.dob} />
                  <Select
                    name="language"
                    label={t('languageLabel') || 'Language'}
                    defaultValue={editing?.language ?? "English"}
                    options={["English", "Spanish", "Other"]}
                  />
                  <Select
                    name="source"
                    label={t('sourceLabel') || 'Source'}
                    defaultValue={editing?.source ?? "Other"}
                    options={["Event", "Referral", "Inbound", "Other"]}
                  />
                  <Select
                    name="status"
                    label={t('statusLabel') || 'Status'}
                    defaultValue={editing?.status ?? "New"}
                    options={["New", "Warm", "Scheduled", "Enrolled", "Not Interested"]}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-800">{t('notes') || 'Notes'}</label>
                  <textarea
                    className="w-full border rounded-lg p-2 mt-1"
                    name="notes"
                    defaultValue={editing?.notes}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Checkbox name="ptc" label={t('permissionToContact') || 'Permission to Contact'} defaultChecked={!!editing?.permissionToContact} />
                  <Checkbox name="newsletter" label={t('monthlyNewsletterLabel') || 'Monthly Newsletter'} defaultChecked={!!editing?.newsletter} />
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-800 mb-1">{t('outreachPlan') || 'Outreach Plan'}</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <Checkbox name="twoMonths" label={t('twoMonths') || '60 Days'} defaultChecked={editing?.outreachPlan?.twoMonths ?? true} />
                    <Checkbox name="oneMonth" label={t('oneMonth') || '30 Days'} defaultChecked={editing?.outreachPlan?.oneMonth ?? true} />
                    <Checkbox name="twoWeeks" label={t('twoWeeks') || '14 Days'} defaultChecked={editing?.outreachPlan?.twoWeeks ?? true} />
                    <Checkbox name="oneWeek" label={t('oneWeek') || '7 Days'} defaultChecked={editing?.outreachPlan?.oneWeek ?? true} />
                    <Checkbox name="aepLive" label={t('aepLive') || 'AEP Live'} defaultChecked={editing?.outreachPlan?.aepLive ?? true} />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-blue-800 text-white px-5 py-2 rounded-xl font-bold shadow hover:bg-blue-900 disabled:opacity-50"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : (editing ? (t('saveChanges') || 'Save Changes') : (t('addContact') || 'Add Contact'))}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="bg-gray-100 text-gray-700 px-5 py-2 rounded-xl hover:bg-gray-200"
                  >
                    {t('cancel') || 'Cancel'}
                  </button>
                </div>
              </form>
            </Modal>
          )}
        </section>
      </div>

      {/* TEMPLATE PREVIEW MODAL */}
      {previewTemplate && (
        <Modal onClose={() => setPreviewTemplate(null)} title={`${previewTemplate.title} Preview`}>
          <pre className="bg-blue-50 rounded p-4 whitespace-pre-wrap mb-4 text-gray-900 text-sm">
            {previewTemplate.content}
          </pre>
          <div className="text-sm font-semibold mb-1">{t('personalizationExample') || 'With Sample Data'}:</div>
          <pre className="bg-blue-100 rounded p-4 whitespace-pre-wrap text-blue-800 text-sm">
            {mergeTags.reduce(
              (acc, tag) => acc.replace(new RegExp(tag.tag.replace(/[{}]/g, '\\$&'), 'g'), tag.description || tag.key),
              previewTemplate.content
            )}
          </pre>
          <div className="flex gap-3 mt-4">
            <button
              className="bg-blue-800 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-900"
              onClick={() => handleTestSend(previewTemplate.content)}
            >
              {t('testSend') || 'Test Send'} (Preview)
            </button>
            <button
              className="bg-green-700 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-green-800"
              onClick={() => handleInsertTemplate(previewTemplate)}
            >
              {t('insert') || 'Copy to Clipboard'}
            </button>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-600 mb-2">{t('mergeTags') || 'Merge Tags'}:</div>
            <div className="flex flex-wrap gap-2">
              {mergeTags.map((tag, i) => (
                <span key={i} className="bg-blue-100 px-3 py-1 rounded-full font-mono text-xs text-blue-900">
                  {tag.tag} <span className="text-gray-500">({tag.description || tag.key})</span>
                </span>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* TEMPLATE EDIT MODAL */}
      {editingTemplate && (
        <Modal onClose={() => setEditingTemplate(null)} title={editingTemplate.id ? 'Edit Template' : 'New Template'}>
          <form onSubmit={handleSaveTemplate} className="space-y-4">
            {editingTemplate.is_system && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded-lg text-sm">
                This is a system template. Editing will create your personal copy.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-800">Title *</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2 mt-1"
                  value={editingTemplate.title}
                  onChange={e => setEditingTemplate(t => ({ ...t, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-800">Type *</label>
                <select
                  className="w-full border rounded-lg p-2 mt-1"
                  value={editingTemplate.type}
                  onChange={e => setEditingTemplate(t => ({ ...t, type: e.target.value }))}
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
            </div>

            {editingTemplate.type === 'email' && (
              <div>
                <label className="text-sm font-semibold text-gray-800">Subject Line</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2 mt-1"
                  value={editingTemplate.subject}
                  onChange={e => setEditingTemplate(t => ({ ...t, subject: e.target.value }))}
                  placeholder="e.g., AEP is coming — let's prepare!"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-gray-800">Content *</label>
              <textarea
                className="w-full border rounded-lg p-2 mt-1 font-mono text-sm"
                value={editingTemplate.content}
                onChange={e => setEditingTemplate(t => ({ ...t, content: e.target.value }))}
                rows={8}
                required
                placeholder={editingTemplate.type === 'sms'
                  ? "Hi {ClientName}, AEP starts Oct 15..."
                  : "Hi {ClientName},\n\nThe Medicare Annual Enrollment Period starts on October 15..."}
              />
              <div className="text-xs text-gray-500 mt-1">
                Available merge tags: {mergeTags.map(t => t.tag).join(', ')}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-800">Tags (comma separated)</label>
              <input
                type="text"
                className="w-full border rounded-lg p-2 mt-1"
                value={(editingTemplate.tags || []).join(', ')}
                onChange={e => setEditingTemplate(t => ({ ...t, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                placeholder="Pre-AEP, Email, Reminder"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-blue-800 text-white px-5 py-2 rounded-xl font-bold shadow hover:bg-blue-900 disabled:opacity-50 flex items-center gap-2"
                disabled={saving}
              >
                <Save size={16} />
                {saving ? 'Saving...' : (editingTemplate.is_system ? 'Save as Copy' : 'Save Template')}
              </button>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="bg-gray-100 text-gray-700 px-5 py-2 rounded-xl hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* -------------------- small components -------------------- */

function SplashCountdown({ remaining, onSkip, t }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white">
      <div className="text-center">
        <div className="inline-flex items-center gap-3 mb-3">
          <Zap className="w-8 h-8 text-yellow-300 animate-pulse" />
          <span className="text-2xl font-extrabold tracking-tight">{t('aepWizardTitle') || 'AEP Wizard'}</span>
        </div>
        <div className="text-sm text-blue-100">{t('loadingPlaybook') || 'Loading your AEP playbook...'}</div>
        <div className="mt-6 grid grid-cols-4 gap-3">
          {[
            ["d", remaining.d],
            ["h", remaining.h],
            ["m", remaining.m],
            ["s", remaining.s],
          ].map(([label, val]) => (
            <div key={label} className="bg-white/10 rounded-2xl px-4 py-3 backdrop-blur shadow">
              <div className="text-3xl font-black">{String(val).padStart(2, "0")}</div>
              <div className="text-xs uppercase tracking-wider text-blue-200">{label}</div>
            </div>
          ))}
        </div>
        <button
          onClick={onSkip}
          className="mt-8 bg-white text-blue-900 font-bold px-5 py-2 rounded-2xl shadow hover:scale-105 transition"
        >
          {t('enterWizard') || 'Enter Wizard'}
        </button>
      </div>
    </div>
  );
}

function ProgressTile({ label, value }) {
  return (
    <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
      <div className="text-sm text-blue-100">{label}</div>
      <div className="text-2xl font-extrabold">{value}%</div>
      <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
        <div className="h-2 bg-yellow-300 rounded-full" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ToggleCard({ label, on, onClick }) {
  return (
    <button
      className={`p-4 rounded-2xl border text-left transition shadow-sm ${
        on ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="font-semibold text-gray-900">{label}</div>
        <div
          className={`w-12 h-6 rounded-full px-0.5 flex items-center ${
            on ? "bg-blue-600 justify-end" : "bg-gray-300 justify-start"
          }`}
        >
          <div className="w-5 h-5 bg-white rounded-full shadow" />
        </div>
      </div>
    </button>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl relative max-h-[90vh] flex flex-col">
        <button className="absolute top-3 right-4 text-gray-400 text-2xl z-10" onClick={onClose}>
          &times;
        </button>
        <div className="p-6 overflow-y-auto">
          {title && <h2 className="text-xl font-bold text-blue-900 mb-4">{title}</h2>}
          {children}
        </div>
      </div>
    </div>
  );
}

function Input({ name, label, type = "text", defaultValue, required }) {
  return (
    <label className="text-sm font-semibold text-gray-800">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="block w-full border rounded-lg p-2 mt-1"
      />
    </label>
  );
}

function Select({ name, label, defaultValue, options = [] }) {
  return (
    <label className="text-sm font-semibold text-gray-800">
      {label}
      <select name={name} defaultValue={defaultValue} className="block w-full border rounded-lg p-2 mt-1">
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({ name, label, defaultChecked }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-800">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}
