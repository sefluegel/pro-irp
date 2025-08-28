// /frontend/src/pages/AEPWizard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Zap, CalendarDays, Send, Eye, MessageSquare, AlertCircle, XCircle,
  CheckCircle2, Plus, Edit2, Download, RefreshCw, Star, Eye as EyeIcon,
  ListChecks, PhoneCall, Mail, Calendar, UserPlus, User, Filter, ArrowUpRight,
  HelpCircle
} from "lucide-react";

/**
 * AEP WIZARD – front-end only
 * - Splash screen with animated countdown to Oct 15 (auto-transitions after ~2.5s)
 * - Hero dashboard with stats & quick actions
 * - Outreach automations (pre-AEP drips, ANOC explainer, booking nudges)
 * - Templates library w/ preview & test-send (alert)
 * - Activity feed w/ resend
 * - Analytics tiles
 * - "Countdown List" (year-round capture for folks who must wait for AEP)
 *   - Add contact modal, outreach plan toggles, newsletter, status tracking
 * - Sticky AI helper (stub)
 * - TailwindCSS + lucide-react
 */

/* -------------------- helpers -------------------- */

// Get next Oct 15 from "now"
function getNextOct15(now = new Date()) {
  const year = now.getMonth() > 9 || (now.getMonth() === 9 && now.getDate() > 15)
    ? now.getFullYear() + 1
    : now.getFullYear();
  return new Date(year, 9, 15, 0, 0, 0, 0); // month idx 9 = October
}

// Format remaining ms -> {d,h,m,s}
function breakdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSeconds / (60 * 60 * 24));
  const h = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const m = Math.floor((totalSeconds % (60 * 60)) / 60);
  const s = totalSeconds % 60;
  return { d, h, m, s };
}

/* -------------------- fake data -------------------- */

const FAKE_ANALYTICS = [
  { label: "Pre-AEP Sends", value: 1802, icon: <Send className="w-6 h-6" /> },
  { label: "Open Rate", value: "62%", icon: <Eye className="w-6 h-6" /> },
  { label: "Click Rate", value: "21%", icon: <ArrowUpRight className="w-6 h-6" /> },
  { label: "Reply Rate", value: "17%", icon: <MessageSquare className="w-6 h-6" /> },
  { label: "Bounces", value: "14", icon: <AlertCircle className="w-6 h-6" /> },
  { label: "Failed Sends", value: "8", icon: <XCircle className="w-6 h-6" /> },
];

const DEFAULT_TEMPLATES = [
  {
    title: "Pre-AEP: Coming Soon",
    type: "Email",
    content:
      "Subject: AEP is coming — let’s prepare!\n\nHi {ClientName},\n\nThe Medicare Annual Enrollment Period starts on October 15. If you'd like a review or have questions, let's get a time on the calendar.\n\nBest,\n{AgentName}\n{AgentPhone}",
    tags: ["Pre-AEP", "Email"],
    featured: true,
  },
  {
    title: "ANOC Explainer",
    type: "Email",
    content:
      "Subject: Your ANOC — what it means\n\nHi {ClientName},\n\nYou’ll receive the Annual Notice of Change (ANOC) from your plan. It explains any updates for {PolicyYear}. If anything looks unclear, reply here and I’ll help review it.\n\nBest,\n{AgentName}",
    tags: ["ANOC", "Education"],
  },
  {
    title: "AEP Booking Nudge",
    type: "SMS",
    content:
      "Hi {ClientName}, AEP starts Oct 15. Want to book your plan review now? Reply YES and I’ll send times. —{AgentName}",
    tags: ["Booking", "SMS"],
  },
  {
    title: "Final Reminder (Oct 14)",
    type: "Email",
    content:
      "Subject: AEP starts tomorrow — ready to review?\n\nHi {ClientName},\n\nAEP begins tomorrow. If you want to look over options, let’s lock in a time.\n\nBest,\n{AgentName}",
    tags: ["Reminder"],
  },
];

const DEFAULT_ACTIVITY = [
  {
    time: "2 mins ago",
    type: "Email",
    to: "jane.smith@email.com",
    subject: "AEP is coming — let’s prepare!",
    status: "delivered",
    automation: "Pre-AEP Coming Soon",
  },
  {
    time: "1 hr ago",
    type: "SMS",
    to: "+1 (859) 555-0198",
    subject: "—",
    status: "failed",
    automation: "Booking Nudge",
    error: "Phone unreachable",
  },
  {
    time: "Today, 7:00 AM",
    type: "Email",
    to: "tim.doe@email.com",
    subject: "Your ANOC — what it means",
    status: "opened",
    automation: "ANOC Explainer",
  },
  {
    time: "Yesterday",
    type: "Email",
    to: "alex@email.com",
    subject: "AEP starts tomorrow — ready to review?",
    status: "delivered",
    automation: "Final Reminder",
  },
];

const MERGE_TAGS = [
  { label: "Client Name", tag: "{ClientName}", sample: "Jane Smith" },
  { label: "Agent Name", tag: "{AgentName}", sample: "Scott Fluegel" },
  { label: "Agent Phone", tag: "{AgentPhone}", sample: "(859) 555-1234" },
  { label: "Policy Year", tag: "{PolicyYear}", sample: "2025" },
];

// “Countdown List” sample contacts
const DEFAULT_COUNTDOWN_CONTACTS = [
  {
    id: 1,
    firstName: "Mark",
    lastName: "Henderson",
    phone: "(859) 555-0101",
    email: "mark.h@example.com",
    zip: "41048",
    county: "Boone",
    dob: "1957-03-22",
    language: "English",
    source: "Event",
    notes: "Met at health fair; wants PPO, compare Rx.",
    permissionToContact: true,
    status: "Warm", // New | Warm | Scheduled | Enrolled | Not Interested
    newsletter: true,
    outreachPlan: {
      twoMonths: true,
      oneMonth: true,
      twoWeeks: true,
      oneWeek: true,
      aepLive: true,
    },
    history: [
      { date: "2025-07-12", channel: "SMS", subject: "Thanks for stopping by!", status: "delivered" },
      { date: "2025-08-01", channel: "Email", subject: "AEP is coming — let’s prepare!", status: "opened" },
    ],
  },
];

/* -------------------- component -------------------- */

export default function AEPWizard() {
  const [showSplash, setShowSplash] = useState(true);
  const [now, setNow] = useState(new Date());
  const target = useMemo(() => getNextOct15(now), [now]);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [activity, setActivity] = useState(DEFAULT_ACTIVITY);
  const [analytics] = useState(FAKE_ANALYTICS);
  const [searchTemplate, setSearchTemplate] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { sender: "ai", text: "I’m the AEP Wizard Helper. Drafts, subjects, outreach plans—just ask!" },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);

  // Automations (front-end toggles only)
  const [automations, setAutomations] = useState({
    preAEP60: true,
    preAEP30: true,
    preAEP14: true,
    preAEP7: true,
    preAEP3: true,
    preAEP1: true,
    anocExplainer: true,
    bookingNudges: true,
    voicemailDropUI: false,
    requireApproval: false,
  });

  // COUNTDOWN LIST (year-round capture)
  const [contacts, setContacts] = useState(DEFAULT_COUNTDOWN_CONTACTS);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Splash auto-transition (2.5s)
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(t);
  }, []);

  // Live clock for countdown
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = breakdown(target.getTime() - now.getTime());

  /* -------- AI helper (stub) -------- */
  function handleAiSend(e) {
    e.preventDefault();
    if (!aiInput.trim()) return;
    setAiMessages((prev) => [...prev, { sender: "user", text: aiInput }]);
    setAiInput("");
    setTimeout(() => {
      setAiMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text:
            aiInput.toLowerCase().includes("subject")
              ? "Try: “AEP starts soon — Let’s lock your review.”"
              : "Here’s a clean, compliant draft:\n\nHi {ClientName}, AEP starts on Oct 15. Would you like to schedule a quick review? —{AgentName}",
        },
      ]);
    }, 700);
  }

  /* -------- Activity actions -------- */
  function handleResend(idx) {
    setActivity((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, status: "delivered", error: undefined } : a))
    );
  }

  function handleExportCSV() {
    // Front-end only demo
    alert("Exported Activity (demo). Hook this to your backend export.");
  }

  /* -------- Templates -------- */
  function handlePreviewTemplate(tpl) {
    setPreviewTemplate(tpl);
  }
  function handleInsertTemplate(tpl) {
    setPreviewTemplate(null);
    alert("Inserted into editor (demo). Wire this to your composer or workflow builder.");
  }
  function handleTestSend(content) {
    const rendered = MERGE_TAGS.reduce(
      (acc, t) => acc.replaceAll(t.tag, t.sample),
      content
    );
    alert("Test send (demo):\n\n" + rendered);
  }

  /* -------- Automations toggles -------- */
  function toggleAuto(key) {
    setAutomations((a) => ({ ...a, [key]: !a[key] }));
  }

  /* -------- Countdown List (contacts) -------- */
  function openAdd() {
    setEditing(null);
    setAddOpen(true);
  }

  function saveContact(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      id: editing?.id ?? Date.now(),
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
      history: editing?.history ?? [],
    };

    setContacts((prev) => {
      if (editing) {
        return prev.map((c) => (c.id === editing.id ? payload : c));
      }
      return [payload, ...prev];
    });
    setAddOpen(false);
  }

  function editContact(c) {
    setEditing(c);
    setAddOpen(true);
  }

  function sendNextDrip(c) {
    // Simple demo: append to history & bump status if needed
    const nextSubject = "Pre-AEP reminder (demo)";
    const today = new Date().toISOString().slice(0, 10);
    setContacts((prev) =>
      prev.map((x) =>
        x.id === c.id
          ? {
              ...x,
              status: x.status === "New" ? "Warm" : x.status,
              history: [...x.history, { date: today, channel: "Email", subject: nextSubject, status: "queued" }],
            }
          : x
      )
    );
    alert(`Queued drip to ${c.firstName} ${c.lastName} (demo).`);
  }

  /* -------------------- UI -------------------- */

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100">
      {/* Splash with countdown */}
      {showSplash && (
        <SplashCountdown
          remaining={remaining}
          onSkip={() => setShowSplash(false)}
        />
      )}

      {/* HEADER */}
      <div className="sticky top-0 z-20 flex items-center justify-between p-6 border-b bg-white/70 backdrop-blur">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-blue-800" />
          <h1 className="text-3xl font-black tracking-tight text-blue-900">AEP Wizard</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="w-5 h-5 text-blue-700" />
          <span className="font-semibold text-blue-900">
            AEP starts in: {remaining.d}d {remaining.h}h {remaining.m}m {remaining.s}s
          </span>
          <button
            className="ml-4 bg-white border border-blue-200 text-blue-900 px-3 py-1.5 rounded-xl font-semibold hover:bg-blue-50"
            onClick={() => setHelpOpen(true)}
          >
            <HelpCircle className="inline-block -mt-0.5 mr-1" size={16} />
            Help
          </button>
        </div>
      </div>

      {/* HELP modal */}
      {helpOpen && (
        <Modal onClose={() => setHelpOpen(false)} title="Using AEP Wizard">
          <ul className="space-y-2 text-gray-700">
            <li>• Use <b>Quick Actions</b> to send pre-AEP blasts, create call lists, and open your scheduler.</li>
            <li>• <b>Automations</b> control your pre-AEP drips (60/30/14/7/3/1 days), ANOC explainers and booking nudges.</li>
            <li>• <b>Templates</b> are ready to personalize with merge tags like <code className="bg-blue-100 px-1 rounded">{MERGE_TAGS[0].tag}</code>.</li>
            <li>• <b>Countdown List</b> stores year-round prospects who must wait until AEP—add, track status, and drip them automatically.</li>
            <li>• The <b>AI Helper</b> can draft copy, subject lines, and compliance-safer phrasing (demo).</li>
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
                <div className="text-sm opacity-90">Event Mode</div>
                <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight">Let’s Win AEP</h2>
                <p className="mt-1 text-blue-100">
                  Focused outreach. Faster booking. Clear priorities. Make every touch count.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="bg-white text-blue-800 px-4 py-2 rounded-xl font-bold shadow hover:scale-105 transition">
                  <Send className="inline -mt-1 mr-1" size={16} />
                  Send Pre-AEP Blast
                </button>
                <button className="bg-white/10 border border-white/30 text-white px-4 py-2 rounded-xl font-bold hover:bg-white/20 transition">
                  <Calendar className="inline -mt-1 mr-1" size={16} />
                  Open Booking
                </button>
                <button className="bg-white/10 border border-white/30 text-white px-4 py-2 rounded-xl font-bold hover:bg-white/20 transition">
                  <ListChecks className="inline -mt-1 mr-1" size={16} />
                  Create Call List
                </button>
              </div>
            </div>
            {/* Progress tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <ProgressTile label="Pre-AEP Outreach" value={72} />
              <ProgressTile label="Booking Goal" value={54} />
              <ProgressTile label="Risk Coverage" value={63} />
              <ProgressTile label="Replies Handled" value={39} />
            </div>
          </section>

          {/* AUTOMATIONS */}
          <section className="bg-white rounded-3xl shadow p-6 border border-blue-100">
            <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
              <Zap className="text-blue-700" /> Outreach Automations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[
                ["preAEP60", "Pre-AEP: 60 days"],
                ["preAEP30", "Pre-AEP: 30 days"],
                ["preAEP14", "Pre-AEP: 14 days"],
                ["preAEP7", "Pre-AEP: 7 days"],
                ["preAEP3", "Pre-AEP: 3 days"],
                ["preAEP1", "Pre-AEP: 1 day"],
                ["anocExplainer", "ANOC Explainer"],
                ["bookingNudges", "Booking Nudges"],
              ].map(([key, label]) => (
                <ToggleCard key={key} label={label} on={automations[key]} onClick={() => toggleAuto(key)} />
              ))}
              <ToggleCard
                label="Voicemail Drop (UI only)"
                on={automations.voicemailDropUI}
                onClick={() => toggleAuto("voicemailDropUI")}
              />
              <ToggleCard
                label="Require Approval"
                on={automations.requireApproval}
                onClick={() => toggleAuto("requireApproval")}
              />
            </div>
          </section>

          {/* TEMPLATES */}
          <section className="bg-white rounded-3xl shadow p-6 border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                <Star className="text-yellow-500" /> Templates
              </h3>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-400" />
                <input
                  type="text"
                  className="rounded-lg border px-2 py-1 text-sm"
                  placeholder="Search templates..."
                  value={searchTemplate}
                  onChange={(e) => setSearchTemplate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates
                .filter(
                  (t) =>
                    t.title.toLowerCase().includes(searchTemplate.toLowerCase()) ||
                    t.tags.join(" ").toLowerCase().includes(searchTemplate.toLowerCase())
                )
                .map((tpl, i) => (
                  <div key={i} className="p-4 rounded-2xl border hover:border-blue-300 transition bg-blue-50/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-900">
                          {tpl.title} <span className="text-xs text-blue-500">({tpl.type})</span>
                        </div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {tpl.tags.map((tag, j) => (
                            <span key={j} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                              {tag}
                            </span>
                          ))}
                          {tpl.featured && (
                            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">Featured</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="text-blue-700 hover:underline text-xs"
                          onClick={() => handlePreviewTemplate(tpl)}
                        >
                          <EyeIcon size={16} className="inline -mt-0.5 mr-1" />
                          Preview
                        </button>
                        <button
                          className="text-green-700 hover:underline text-xs"
                          onClick={() => handleInsertTemplate(tpl)}
                        >
                          <Plus size={16} className="inline -mt-0.5 mr-1" />
                          Insert
                        </button>
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
              <ListChecks className="text-blue-700" /> Activity Feed
            </h3>
            <div className="max-h-72 overflow-y-auto divide-y">
              {activity.map((a, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-gray-800">{a.automation}</div>
                    <div className="text-xs text-gray-500">
                      {a.time} &bull; {a.type} &bull; {a.to}
                    </div>
                    {a.subject !== "—" && <div className="text-xs text-gray-400">{a.subject}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    {a.status === "delivered" && (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 size={16} /> Delivered
                      </span>
                    )}
                    {a.status === "opened" && (
                      <span className="text-blue-600 flex items-center gap-1">
                        <Eye size={16} /> Opened
                      </span>
                    )}
                    {a.status === "failed" && (
                      <>
                        <span className="text-red-600 flex items-center gap-1">
                          <XCircle size={16} /> Failed
                        </span>
                        <button className="text-blue-700 underline text-xs" onClick={() => handleResend(idx)}>
                          <RefreshCw size={14} className="inline -mt-0.5 mr-1" />
                          Resend
                        </button>
                        <span className="text-xs text-red-400">{a.error}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              className="mt-3 text-xs text-blue-900 flex items-center gap-1 hover:underline"
              onClick={handleExportCSV}
            >
              <Download size={16} /> Export (CSV)
            </button>
          </section>

          {/* ANALYTICS */}
          <section className="bg-white rounded-3xl shadow p-6 border border-blue-100">
            <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
              <Eye className="text-blue-700" /> Analytics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {analytics.map((a, i) => (
                <div key={i} className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow flex flex-col items-center justify-center p-4 border">
                  <div className="mb-1">{a.icon}</div>
                  <div className="text-xl font-black text-blue-800">{a.value}</div>
                  <div className="text-xs text-gray-600">{a.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* AI CHAT */}
          <div className="relative">
            {aiOpen ? (
              <div className="w-full bg-white shadow-2xl rounded-2xl border border-blue-200 flex flex-col">
                <div className="bg-blue-900 text-white px-4 py-2 rounded-t-2xl flex justify-between items-center">
                  <span className="font-semibold">AEP Wizard Helper</span>
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
                    placeholder="Ask me to draft, optimize, or summarize…"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    autoFocus
                  />
                  <button className="bg-blue-700 text-white px-3 py-2 rounded-lg hover:bg-blue-900" type="submit">
                    Send
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
                <span className="font-bold">Open AI Helper</span>
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
              <Calendar className="text-blue-700" /> Countdown List
            </h3>
            <button
              onClick={openAdd}
              className="bg-blue-800 text-white px-4 py-2 rounded-xl font-bold shadow hover:bg-blue-900"
            >
              <UserPlus className="inline -mt-1 mr-1" size={16} />
              Add Contact
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">ZIP</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Newsletter</th>
                  <th className="py-2 pr-4">Plan</th>
                  <th className="py-2 pr-4">Actions</th>
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
                    <td className="py-2 pr-4">{c.newsletter ? "Yes" : "No"}</td>
                    <td className="py-2 pr-4">
                      <div className="text-xs text-gray-600">
                        2mo {c.outreachPlan.twoMonths ? "•" : "×"} / 1mo {c.outreachPlan.oneMonth ? "•" : "×"} / 2w{" "}
                        {c.outreachPlan.twoWeeks ? "•" : "×"} / 1w {c.outreachPlan.oneWeek ? "•" : "×"} / Live{" "}
                        {c.outreachPlan.aepLive ? "•" : "×"}
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2">
                        <button
                          className="text-blue-700 text-xs underline"
                          onClick={() => sendNextDrip(c)}
                          title="Send next drip (demo)"
                        >
                          Send Drip
                        </button>
                        <button
                          className="text-gray-700 text-xs underline"
                          onClick={() => editContact(c)}
                          title="Edit"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {contacts.length === 0 && (
                  <tr>
                    <td className="py-6 text-gray-500" colSpan={8}>
                      No contacts yet. Click <b>Add Contact</b> to start your Countdown List.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add/Edit modal */}
          {addOpen && (
            <Modal onClose={() => setAddOpen(false)} title={editing ? "Edit Countdown Contact" : "Add Countdown Contact"}>
              <form onSubmit={saveContact} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input name="firstName" label="First Name" defaultValue={editing?.firstName} required />
                  <Input name="lastName" label="Last Name" defaultValue={editing?.lastName} required />
                  <Input name="phone" label="Phone" defaultValue={editing?.phone} />
                  <Input name="email" label="Email" defaultValue={editing?.email} />
                  <Input name="zip" label="ZIP" defaultValue={editing?.zip} />
                  <Input name="county" label="County" defaultValue={editing?.county} />
                  <Input name="dob" type="date" label="DOB" defaultValue={editing?.dob} />
                  <Select
                    name="language"
                    label="Language"
                    defaultValue={editing?.language ?? "English"}
                    options={["English", "Spanish", "Other"]}
                  />
                  <Select
                    name="source"
                    label="Source"
                    defaultValue={editing?.source ?? "Other"}
                    options={["Event", "Referral", "Inbound", "Other"]}
                  />
                  <Select
                    name="status"
                    label="Status"
                    defaultValue={editing?.status ?? "New"}
                    options={["New", "Warm", "Scheduled", "Enrolled", "Not Interested"]}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-800">Notes</label>
                  <textarea
                    className="w-full border rounded-lg p-2 mt-1"
                    name="notes"
                    defaultValue={editing?.notes}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Checkbox name="ptc" label="Permission to Contact" defaultChecked={!!editing?.permissionToContact} />
                  <Checkbox name="newsletter" label="Monthly Newsletter" defaultChecked={!!editing?.newsletter} />
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-800 mb-1">Outreach Plan</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <Checkbox name="twoMonths" label="2 Months" defaultChecked={editing?.outreachPlan?.twoMonths ?? true} />
                    <Checkbox name="oneMonth" label="1 Month" defaultChecked={editing?.outreachPlan?.oneMonth ?? true} />
                    <Checkbox name="twoWeeks" label="2 Weeks" defaultChecked={editing?.outreachPlan?.twoWeeks ?? true} />
                    <Checkbox name="oneWeek" label="1 Week" defaultChecked={editing?.outreachPlan?.oneWeek ?? true} />
                    <Checkbox name="aepLive" label="AEP Live" defaultChecked={editing?.outreachPlan?.aepLive ?? true} />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-blue-800 text-white px-5 py-2 rounded-xl font-bold shadow hover:bg-blue-900"
                  >
                    {editing ? "Save Changes" : "Add Contact"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="bg-gray-100 text-gray-700 px-5 py-2 rounded-xl hover:bg-gray-200"
                  >
                    Cancel
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
          <div className="text-sm font-semibold mb-1">Personalization Example</div>
          <pre className="bg-blue-100 rounded p-4 whitespace-pre-wrap text-blue-800 text-sm">
            {MERGE_TAGS.reduce(
              (acc, t) => acc.replaceAll(t.tag, t.sample),
              previewTemplate.content
            )}
          </pre>
          <div className="flex gap-3 mt-4">
            <button
              className="bg-blue-800 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-900"
              onClick={() => handleTestSend(previewTemplate.content)}
            >
              Test Send (demo)
            </button>
            <button
              className="bg-green-700 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-green-800"
              onClick={() => handleInsertTemplate(previewTemplate)}
            >
              Insert
            </button>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-600 mb-2">Merge Tags:</div>
            <div className="flex flex-wrap gap-2">
              {MERGE_TAGS.map((t, i) => (
                <span key={i} className="bg-blue-100 px-3 py-1 rounded-full font-mono text-xs text-blue-900">
                  {t.tag} <span className="text-gray-500">({t.label})</span>
                </span>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* -------------------- small components -------------------- */

function SplashCountdown({ remaining, onSkip }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white">
      <div className="text-center">
        <div className="inline-flex items-center gap-3 mb-3">
          <Zap className="w-8 h-8 text-yellow-300 animate-pulse" />
          <span className="text-2xl font-extrabold tracking-tight">AEP Wizard</span>
        </div>
        <div className="text-sm text-blue-100">Loading the playbook…</div>
        <div className="mt-6 grid grid-cols-4 gap-3">
          {[
            ["Days", remaining.d],
            ["Hours", remaining.h],
            ["Minutes", remaining.m],
            ["Seconds", remaining.s],
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
          Enter Wizard
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
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl relative">
        <button className="absolute top-3 right-4 text-gray-400 text-2xl" onClick={onClose}>
          &times;
        </button>
        <div className="p-6">
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
