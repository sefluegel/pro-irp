// /frontend/src/pages/OEPHub.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Shield, // just for vibe
  ThumbsUp, MessageSquare, Send, Users, TrendingDown, TrendingUp,
  XCircle, CheckCircle2, RefreshCw, Download, CalendarDays, Calendar,
  Plus, UserPlus, Edit2, Mail, Phone, HeartHandshake, Award,
  Filter, Eye, HelpCircle
} from "lucide-react";

/**
 * OEP RETENTION HUB – Front-end only
 * - Built to retain clients written during AEP (and mid-year first-timers)
 * - No countdown; high-energy visuals like AEP Wizard
 * - Auto-cohort for next OEP season (Jan 1 – Mar 31)
 *   * includes clients first-time with agent with effectiveDate ∈ [May 1 (prev yr), Jan 1 (season yr)]
 * - Automations: Jan 1, Feb 1, Mar 1
 * - Trackers: cohort size, follow-ups sent, churn count, retention %
 * - Templates + test send (alert)
 * - Activity feed + resend
 * - AI helper (stub)
 * - TailwindCSS + lucide-react
 */

/* -------------------- helpers -------------------- */

// Given "now", figure out the *next* OEP season range
function getOEPSeason(now = new Date()) {
  // OEP is Jan 1 - Mar 31
  const y = now.getFullYear();
  const inCurrentOEP = now.getMonth() <= 2; // Jan=0, Feb=1, Mar=2
  const seasonYear = inCurrentOEP ? y : y + 1; // if past March, next OEP is next year
  const start = new Date(seasonYear, 0, 1); // Jan 1
  const end = new Date(seasonYear, 2, 31, 23, 59, 59, 999); // Mar 31
  // Cohort window: May 1 (prev year) through Jan 1 (season year)
  const cohortStart = new Date(seasonYear - 1, 4, 1); // May 1 prev year
  const cohortEnd = new Date(seasonYear, 0, 1); // Jan 1 of season
  return { seasonYear, start, end, cohortStart, cohortEnd, inCurrentOEP };
}

function parseISO(d) {
  // safe parse
  const t = typeof d === "string" ? Date.parse(d) : d?.getTime?.();
  return Number.isFinite(t) ? new Date(t) : null;
}

/* -------------------- fake data -------------------- */

const DEFAULT_CLIENTS = [
  // Sample data; wire to real clients list later
  {
    id: 1,
    firstName: "Jane",
    lastName: "Albright",
    effectiveDate: "2026-01-01", // AEP new start
    firstWithAgent: true,
    phone: "(859) 555-0111",
    email: "jane.a@example.com",
    status: "Active", // Active | Switched | Cancelled
    newsletter: true,
    outreachPlan: { jan1: true, feb1: true, mar1: true },
    history: [
      { date: "2025-12-10", channel: "Email", subject: "Welcome to Pro IRP!", status: "delivered" },
    ],
  },
  {
    id: 2,
    firstName: "Carlos",
    lastName: "Diaz",
    effectiveDate: "2025-08-01", // mid-year, first-time
    firstWithAgent: true,
    phone: "(859) 555-0122",
    email: "carlos.d@example.com",
    status: "Active",
    newsletter: false,
    outreachPlan: { jan1: true, feb1: true, mar1: true },
    history: [
      { date: "2025-08-02", channel: "SMS", subject: "Welcome!", status: "delivered" },
    ],
  },
  {
    id: 3,
    firstName: "Rita",
    lastName: "Nguyen",
    effectiveDate: "2025-06-01",
    firstWithAgent: true,
    phone: "(859) 555-0133",
    email: "rita.n@example.com",
    status: "Switched",
    newsletter: true,
    outreachPlan: { jan1: true, feb1: true, mar1: true },
    history: [],
  },
  {
    id: 4,
    firstName: "Tom",
    lastName: "Baker",
    effectiveDate: "2025-02-01", // out of cohort window
    firstWithAgent: true,
    phone: "(859) 555-0144",
    email: "tom.b@example.com",
    status: "Active",
    newsletter: false,
    outreachPlan: { jan1: false, feb1: false, mar1: false },
    history: [],
  },
];

const DEFAULT_ACTIVITY = [
  {
    time: "2 mins ago",
    type: "Email",
    to: "jane.a@example.com",
    subject: "Welcome—Your coverage is active!",
    status: "delivered",
    automation: "Jan 1 Congratulatory",
  },
  {
    time: "Today, 8:03 AM",
    type: "SMS",
    to: "carlos.d@example.com",
    subject: "—",
    status: "opened",
    automation: "Feb 1 First Full Month",
  },
  {
    time: "Yesterday",
    type: "Email",
    to: "rita.n@example.com",
    subject: "March Check-in & Referral",
    status: "failed",
    automation: "Mar 1 Follow-up",
    error: "Mailbox full",
  },
];

const DEFAULT_TEMPLATES = [
  {
    id: 1,
    titleKey: "jan1Welcome",
    title: "Jan 1 Welcome",
    type: "Email",
    subject: "Your new coverage is active — congrats!",
    content:
      "Hi {ClientName},\n\nToday your new coverage is in effect. Have you received your plan ID cards? If you have any questions, I'm here to help.\n\nBest,\n{AgentName}\n{AgentPhone}",
    tags: ["Jan 1", "Welcome"],
    featured: true,
  },
  {
    id: 2,
    titleKey: "benefitReminder",
    title: "Feb 1 Check-in",
    type: "Email",
    subject: "One month in — how is your plan going?",
    content:
      "Hi {ClientName},\n\nYou're in the first full month of your plan. Any issues with pharmacies, doctors, or billing I can help solve?\n\nBest,\n{AgentName}",
    tags: ["Feb 1", "Check-in"],
  },
  {
    id: 3,
    titleKey: "satisfactionCheck",
    title: "Mar 1 Follow-up + Referral",
    type: "SMS",
    content:
      "Hi {ClientName}, we're two months in—any issues I can fix? If you're happy, referrals are appreciated. —{AgentName}",
    tags: ["Mar 1", "Referral", "SMS"],
  },
  {
    id: 4,
    title: "ID Cards Reminder",
    type: "Email",
    subject: "Have your ID cards arrived?",
    content:
      "Hi {ClientName},\n\nJust checking in — have your new Medicare ID cards arrived? If not, I can help expedite them with your carrier.\n\nBest,\n{AgentName}\n{AgentPhone}",
    tags: ["Jan", "ID Cards"],
  },
  {
    id: 5,
    title: "Pharmacy Check",
    type: "Email",
    subject: "Quick pharmacy check-in",
    content:
      "Hi {ClientName},\n\nHave you had a chance to pick up any prescriptions with your new plan? Let me know if there were any surprises with copays or formulary changes.\n\nBest,\n{AgentName}",
    tags: ["Feb", "Pharmacy"],
  },
  {
    id: 6,
    title: "Referral Ask",
    type: "SMS",
    content:
      "Hi {ClientName}, if you're happy with your coverage, I'd appreciate any referrals to friends or family who might need help during Medicare enrollment. —{AgentName}",
    tags: ["Mar", "Referral", "SMS"],
  },
  {
    id: 7,
    title: "Save Attempt",
    type: "Email",
    subject: "Before you switch — can I help?",
    content:
      "Hi {ClientName},\n\nI noticed a change on your plan. Before anything finalizes, can I fix any issues—copays, pharmacies, doctors—so you're fully set?\n\nI want to make sure you have the best coverage for your needs.\n\nBest,\n{AgentName}\n{AgentPhone}",
    tags: ["Retention", "Save"],
    featured: true,
  },
  {
    id: 8,
    title: "Monthly Newsletter",
    type: "Email",
    subject: "{PolicyYear} Medicare Updates",
    content:
      "Hi {ClientName},\n\nHere's your monthly Medicare update:\n\n• Important dates to remember\n• Tips for getting the most from your plan\n• New benefits you might not know about\n\nQuestions? Reply to this email or call me anytime.\n\nBest,\n{AgentName}\n{AgentPhone}",
    tags: ["Newsletter", "Monthly"],
  },
];

const MERGE_TAGS = [
  { labelKey: "clientName", label: "Client Name", tag: "{ClientName}", sample: "Jane Albright" },
  { labelKey: "agentName", label: "Agent Name", tag: "{AgentName}", sample: "Scott Fluegel" },
  { labelKey: "agentPhone", label: "Agent Phone", tag: "{AgentPhone}", sample: "(859) 555-1234" },
  { labelKey: "policyYear", label: "Policy Year", tag: "{PolicyYear}", sample: "2025" },
];

/* -------------------- component -------------------- */

export default function OEPHub({ clients: propClients }) {
  const { t } = useTranslation();
  const [now] = useState(new Date());
  const season = useMemo(() => getOEPSeason(now), [now]);

  // Core state (mocked for MVP)
  const [allClients, setAllClients] = useState(propClients ?? DEFAULT_CLIENTS);
  const [activity, setActivity] = useState(DEFAULT_ACTIVITY);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [searchTemplate, setSearchTemplate] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { sender: "ai", text: t('askAboutAutomations') },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false);

  const [automations, setAutomations] = useState({
    jan1: true,
    feb1: true,
    mar1: true,
    newsletter: true,
    requireApproval: false,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Build OEP cohort:
  // – include firstWithAgent === true
  // – effectiveDate ∈ [cohortStart, cohortEnd]
  // – show "Active season" label if today ∈ [start, end]
  const oepCohort = useMemo(() => {
    const { cohortStart, cohortEnd } = season;
    return allClients.filter((c) => {
      const eff = parseISO(c.effectiveDate);
      if (!eff || !c.firstWithAgent) return false;
      return eff >= cohortStart && eff <= cohortEnd;
    });
  }, [allClients, season]);

  // KPIs
  const cohortSize = oepCohort.length;
  const followupsSent = activity.length; // simple demo metric
  const churnCount = oepCohort.filter((c) => c.status === "Switched" || c.status === "Cancelled").length;
  const retentionPct = cohortSize === 0 ? "—" : `${Math.round(((cohortSize - churnCount) / cohortSize) * 100)}%`;
  const inSeason = now >= season.start && now <= season.end;

  /* -------- AI helper (stub) -------- */
  function handleAiSend(e) {
    e.preventDefault();
    if (!aiInput.trim()) return;
    const q = aiInput;
    setAiMessages((prev) => [...prev, { sender: "user", text: q }]);
    setAiInput("");
    setTimeout(() => {
      setAiMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text:
            q.toLowerCase().includes("save") || q.toLowerCase().includes("churn")
              ? "Try this save: \n\nHi {ClientName}, I noticed a change on your plan. Before anything finalizes, can I fix any issues—copays, pharmacies, doctors—so you're fully set?\n\n—{AgentName}"
              : "Jan/Feb/Mar cadence:\n• Jan 1: Congrats, cards arrived?\n• Feb 1: First month check-in\n• Mar 1: Final follow-up + referrals",
        },
      ]);
    }, 600);
  }

  /* -------- Activity actions -------- */
  function handleResend(idx) {
    setActivity((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, status: "delivered", error: undefined } : a))
    );
  }

  function handleExportCSV() {
    alert("Exported OEP activity (demo). Connect to backend to download CSV.");
  }

  /* -------- Templates -------- */
  function handlePreviewTemplate(tpl) {
    setPreviewTemplate(tpl);
  }
  function handleInsertTemplate(tpl) {
    setPreviewTemplate(null);
    alert("Inserted into composer (demo).");
  }
  function handleTestSend(content) {
    const rendered = content
      .replaceAll("{ClientName}", "Jane Albright")
      .replaceAll("{AgentName}", "Scott Fluegel")
      .replaceAll("{AgentPhone}", "(859) 555-1234")
      .replaceAll("{PolicyYear}", String(season.seasonYear));
    alert("Test send (demo):\n\n" + rendered);
  }

  function handleEditTemplate(tpl) {
    setEditingTemplate({ ...tpl });
  }

  function handleSaveTemplate(e) {
    e.preventDefault();
    if (!editingTemplate) return;

    if (editingTemplate.id) {
      // Update existing
      setTemplates((prev) => prev.map((t) => t.id === editingTemplate.id ? editingTemplate : t));
    } else {
      // Create new
      const newTpl = { ...editingTemplate, id: Date.now() };
      setTemplates((prev) => [newTpl, ...prev]);
    }
    setEditingTemplate(null);
  }

  function handleCreateTemplate() {
    setEditingTemplate({
      title: "",
      type: "Email",
      subject: "",
      content: "",
      tags: [],
      featured: false,
    });
  }

  function handleDeleteTemplate(id) {
    if (!confirm("Delete this template?")) return;
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }

  /* -------- Automations toggles -------- */
  function toggleAuto(key) {
    setAutomations((a) => ({ ...a, [key]: !a[key] }));
  }

  /* -------- Add/Edit Client to OEP list (front-end only) -------- */
  function openAdd() {
    setEditing(null);
    setAddOpen(true);
  }

  function saveClient(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      id: editing?.id ?? Date.now(),
      firstName: form.get("firstName")?.trim() || "",
      lastName: form.get("lastName")?.trim() || "",
      effectiveDate: form.get("effectiveDate") || "",
      firstWithAgent: form.get("firstWithAgent") === "on",
      phone: form.get("phone")?.trim() || "",
      email: form.get("email")?.trim() || "",
      status: form.get("status") || "Active",
      newsletter: form.get("newsletter") === "on",
      outreachPlan: {
        jan1: form.get("jan1") === "on",
        feb1: form.get("feb1") === "on",
        mar1: form.get("mar1") === "on",
      },
      history: editing?.history ?? [],
    };

    setAllClients((prev) => {
      if (editing) return prev.map((c) => (c.id === editing.id ? payload : c));
      return [payload, ...prev];
    });
    setAddOpen(false);
  }

  function editClient(c) {
    setEditing(c);
    setAddOpen(true);
  }

  function sendFollowUp(c, which) {
    // Demo: append to history & activity, count as follow-up
    const subjectLookup = {
      jan1: "Welcome—Your coverage is active!",
      feb1: "One month in — any issues I can fix?",
      mar1: "Quick check-in & referrals",
    };
    const subject = subjectLookup[which] || "OEP follow-up";
    const today = new Date().toISOString().slice(0, 10);

    setAllClients((prev) =>
      prev.map((x) =>
        x.id === c.id
          ? {
              ...x,
              history: [...(x.history || []), { date: today, channel: "Email", subject, status: "queued" }],
            }
          : x
      )
    );
    setActivity((prev) => [
      {
        time: "now",
        type: "Email",
        to: c.email || c.phone || `${c.firstName} ${c.lastName}`,
        subject,
        status: "delivered",
        automation: which === "jan1" ? "Jan 1 Congratulatory" : which === "feb1" ? "Feb 1 First Full Month" : "Mar 1 Follow-up",
      },
      ...prev,
    ]);
    alert(`Queued ${which.toUpperCase()} follow-up to ${c.firstName} (demo).`);
  }

  /* -------------------- UI -------------------- */

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-indigo-100">
      {/* HEADER */}
      <div className="sticky top-0 z-20 flex items-center justify-between p-6 border-b bg-white/70 backdrop-blur">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-indigo-800" />
          <h1 className="text-3xl font-black tracking-tight text-indigo-900">{t('oepRetentionHub')}</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <CalendarDays className="w-5 h-5 text-indigo-700" />
          <span className="font-semibold text-indigo-900">
            {t('oepSeason')}: Jan 1 – Mar 31, {season.seasonYear} {inSeason ? `• ${t('oepSeasonActive')}` : `• ${t('oepSeasonUpcoming')}`}
          </span>
          <button
            className="ml-3 bg-white border border-indigo-200 text-indigo-900 px-3 py-1.5 rounded-xl font-semibold hover:bg-indigo-50"
            onClick={() => setHelpOpen(true)}
          >
            <HelpCircle className="inline-block -mt-0.5 mr-1" size={16} />
            {t('help')}
          </button>
        </div>
      </div>

      {/* HELP modal */}
      {helpOpen && (
        <Modal title={t('oepRetentionHub')} onClose={() => setHelpOpen(false)}>
          <ul className="space-y-2 text-gray-700">
            <li>• {t('stopChurnBeforeStarts')}</li>
            <li>• {t('jan1Congrats')}</li>
            <li>• {t('feb1FirstMonth')}</li>
            <li>• {t('mar1FollowUpReferrals')}</li>
            <li>• {t('monthlyNewslettersCohort')}</li>
          </ul>
        </Modal>
      )}

      {/* BODY */}
      <div className="px-6 py-8 grid grid-cols-1 2xl:grid-cols-5 gap-6">
        {/* LEFT: Hero + Automations */}
        <div className="2xl:col-span-3 flex flex-col gap-6">
          {/* HERO */}
          <section className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 text-white rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="text-sm opacity-90">{t('retentionMode')}</div>
                <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight">{t('keepEveryWin')}</h2>
                <p className="mt-1 text-indigo-100">
                  {t('stopChurnBeforeStarts')}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="bg-white text-indigo-800 px-4 py-2 rounded-xl font-bold shadow hover:scale-105 transition">
                  <Send className="inline -mt-1 mr-1" size={16} />
                  {t('sendJan1Blast')}
                </button>
                <button className="bg-white/10 border border-white/30 text-white px-4 py-2 rounded-xl font-bold hover:bg-white/20 transition">
                  <HeartHandshake className="inline -mt-1 mr-1" size={16} />
                  {t('openServiceDesk')}
                </button>
                <button className="bg-white/10 border border-white/30 text-white px-4 py-2 rounded-xl font-bold hover:bg-white/20 transition">
                  <Award className="inline -mt-1 mr-1" size={16} />
                  {t('referralToolkit')}
                </button>
              </div>
            </div>
            {/* KPI Tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <KPI label={t('oepCohort')} value={cohortSize} icon={<Users className="w-5 h-5" />} />
              <KPI label={t('followUpsSent')} value={followupsSent} icon={<Send className="w-5 h-5" />} />
              <KPI label={t('churn')} value={churnCount} icon={<TrendingDown className="w-5 h-5" />} />
              <KPI label={t('retention')} value={retentionPct} icon={<TrendingUp className="w-5 h-5" />} />
            </div>
          </section>

          {/* AUTOMATIONS */}
          <section className="bg-white rounded-3xl shadow p-6 border border-indigo-100">
            <h3 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <Calendar className="text-indigo-700" /> {t('oepAutomations')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[
                ["jan1", t('jan1Congrats')],
                ["feb1", t('feb1FirstMonth')],
                ["mar1", t('mar1FollowUpReferrals')],
                ["newsletter", t('monthlyNewslettersCohort')],
                ["requireApproval", t('requireApproval')],
              ].map(([key, label]) => (
                <ToggleCard key={key} label={label} on={automations[key]} onClick={() => toggleAuto(key)} />
              ))}
            </div>
          </section>

          {/* TEMPLATES */}
          <section className="bg-white rounded-3xl shadow p-6 border border-indigo-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                <Mail className="text-indigo-700" /> {t('templates')}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTemplateLibraryOpen(true)}
                  className="bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold shadow hover:bg-indigo-800"
                >
                  <Eye className="inline -mt-1 mr-1" size={16} />
                  View All Templates
                </button>
                <button
                  onClick={handleCreateTemplate}
                  className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-700"
                >
                  <Plus size={14} className="inline -mt-0.5 mr-1" />
                  New Template
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <Filter size={16} className="text-gray-400" />
              <input
                type="text"
                className="rounded-lg border px-2 py-1 text-sm flex-1"
                placeholder={t('searchTemplatesPlaceholder')}
                value={searchTemplate}
                onChange={(e) => setSearchTemplate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates
                .filter(
                  (tpl) =>
                    (tpl.title || t(tpl.titleKey) || "").toLowerCase().includes(searchTemplate.toLowerCase()) ||
                    tpl.tags.join(" ").toLowerCase().includes(searchTemplate.toLowerCase())
                )
                .slice(0, 4)
                .map((tpl, i) => (
                  <div key={tpl.id || i} className="p-4 rounded-2xl border hover:border-indigo-300 transition bg-indigo-50/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-900">
                          {tpl.title || t(tpl.titleKey)} <span className="text-xs text-indigo-500">({tpl.type})</span>
                        </div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {tpl.tags.map((tag, j) => (
                            <span key={j} className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                              {tag}
                            </span>
                          ))}
                          {tpl.featured && (
                            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">{t('featured')}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="text-indigo-700 hover:underline text-xs" onClick={() => handlePreviewTemplate(tpl)}>
                          <Eye size={16} className="inline -mt-0.5 mr-1" />
                          {t('preview')}
                        </button>
                        <button className="text-green-700 hover:underline text-xs" onClick={() => handleInsertTemplate(tpl)}>
                          {t('insert')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            {templates.length > 4 && (
              <button
                onClick={() => setTemplateLibraryOpen(true)}
                className="mt-4 text-indigo-700 hover:underline text-sm font-semibold"
              >
                View all {templates.length} templates →
              </button>
            )}
          </section>
        </div>

        {/* RIGHT: Activity + AI */}
        <div className="2xl:col-span-2 flex flex-col gap-6">
          {/* ACTIVITY */}
          <section className="bg-white rounded-3xl shadow p-6 border border-indigo-100">
            <h3 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <MessageSquare className="text-indigo-700" /> {t('activityFeed')}
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
                        <CheckCircle2 size={16} /> {t('delivered')}
                      </span>
                    )}
                    {a.status === "opened" && (
                      <span className="text-indigo-600 flex items-center gap-1">
                        <Eye size={16} /> {t('opened')}
                      </span>
                    )}
                    {a.status === "failed" && (
                      <>
                        <span className="text-red-600 flex items-center gap-1">
                          <XCircle size={16} /> {t('failed')}
                        </span>
                        <button className="text-indigo-700 underline text-xs" onClick={() => handleResend(idx)}>
                          <RefreshCw size={14} className="inline -mt-0.5 mr-1" />
                          {t('resend')}
                        </button>
                        <span className="text-xs text-red-400">{a.error}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-3 text-xs text-indigo-900 flex items-center gap-1 hover:underline" onClick={handleExportCSV}>
              <Download size={16} /> {t('exportCsv')}
            </button>
          </section>

          {/* AI CHAT */}
          <div className="relative">
            {aiOpen ? (
              <div className="w-full bg-white shadow-2xl rounded-2xl border border-indigo-200 flex flex-col">
                <div className="bg-indigo-900 text-white px-4 py-2 rounded-t-2xl flex justify-between items-center">
                  <span className="font-semibold">{t('oepRetentionHelper')}</span>
                  <button className="text-white text-xl" onClick={() => setAiOpen(false)} title="Close">
                    ×
                  </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 min-h-[220px] max-h-72">
                  {aiMessages.map((m, i) => (
                    <div
                      key={i}
                      className={`mb-3 whitespace-pre-line ${
                        m.sender === "ai" ? "text-indigo-900 bg-indigo-50 p-2 rounded-xl" : "text-right"
                      }`}
                    >
                      {m.text}
                    </div>
                  ))}
                </div>
                <form className="border-t flex items-center gap-2 p-2" onSubmit={handleAiSend}>
                  <input
                    className="flex-1 rounded-lg border px-3 py-2 text-sm"
                    placeholder={t('askForCheckin')}
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    autoFocus
                  />
                  <button className="bg-indigo-700 text-white px-3 py-2 rounded-lg hover:bg-indigo-900" type="submit">
                    {t('send')}
                  </button>
                </form>
              </div>
            ) : (
              <button
                className="bg-indigo-800 text-white rounded-xl px-4 py-2 shadow-2xl flex items-center gap-2 hover:scale-105 transition"
                onClick={() => setAiOpen(true)}
                title="Open OEP Retention Helper"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="font-bold">{t('openAiHelper')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* OEP COHORT TABLE */}
      <div className="px-6 pb-10">
        <section className="bg-white rounded-3xl shadow p-6 border border-indigo-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
              <Users className="text-indigo-700" /> {t('oepCohort')}
            </h3>
            <button onClick={openAdd} className="bg-indigo-800 text-white px-4 py-2 rounded-xl font-bold shadow hover:bg-indigo-900">
              <UserPlus className="inline -mt-1 mr-1" size={16} />
              {t('addOepClient')}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">{t('name')}</th>
                  <th className="py-2 pr-4">{t('effectiveDateLabel')}</th>
                  <th className="py-2 pr-4">{t('phone')}</th>
                  <th className="py-2 pr-4">{t('email')}</th>
                  <th className="py-2 pr-4">{t('status')}</th>
                  <th className="py-2 pr-4">{t('monthlyNewsletterLabel')}</th>
                  <th className="py-2 pr-4">{t('outreachPlan')}</th>
                  <th className="py-2 pr-4">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {oepCohort.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-semibold text-gray-900">
                      {c.firstName} {c.lastName}
                    </td>
                    <td className="py-2 pr-4">
                      {parseISO(c.effectiveDate)?.toLocaleDateString?.() || c.effectiveDate}
                    </td>
                    <td className="py-2 pr-4">{c.phone}</td>
                    <td className="py-2 pr-4">{c.email}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          c.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : c.status === "Switched"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{c.newsletter ? t('yesLabel') : t('noLabel')}</td>
                    <td className="py-2 pr-4">
                      <div className="text-xs text-gray-600">
                        Jan1 {c.outreachPlan.jan1 ? "•" : "×"} / Feb1 {c.outreachPlan.feb1 ? "•" : "×"} / Mar1{" "}
                        {c.outreachPlan.mar1 ? "•" : "×"}
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2">
                        <button className="text-indigo-700 text-xs underline" onClick={() => sendFollowUp(c, "jan1")}>
                          {t('sendJan1')}
                        </button>
                        <button className="text-indigo-700 text-xs underline" onClick={() => sendFollowUp(c, "feb1")}>
                          {t('sendFeb1')}
                        </button>
                        <button className="text-indigo-700 text-xs underline" onClick={() => sendFollowUp(c, "mar1")}>
                          {t('sendMar1')}
                        </button>
                        <button className="text-gray-700 text-xs underline" onClick={() => editClient(c)}>
                          {t('edit')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {oepCohort.length === 0 && (
                  <tr>
                    <td className="py-6 text-gray-500" colSpan={8}>
                      {t('noClientsInOepCohort')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add/Edit modal */}
          {addOpen && (
            <Modal onClose={() => setAddOpen(false)} title={editing ? t('editOepClient') : t('addOepClient')}>
              <form onSubmit={saveClient} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input name="firstName" label={t('firstName')} defaultValue={editing?.firstName} required />
                  <Input name="lastName" label={t('lastName')} defaultValue={editing?.lastName} required />
                  <Input name="phone" label={t('phone')} defaultValue={editing?.phone} />
                  <Input name="email" label={t('email')} defaultValue={editing?.email} />
                  <Input name="effectiveDate" type="date" label={t('effectiveDateLabel')} defaultValue={editing?.effectiveDate} required />
                  <Select name="status" label={t('status')} defaultValue={editing?.status ?? "Active"} options={[t('activeStatus'), t('switchedStatus'), t('cancelledStatus')]} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Checkbox name="firstWithAgent" label={t('firstTimeWithAgent')} defaultChecked={!!editing?.firstWithAgent || !editing} />
                  <Checkbox name="newsletter" label={t('monthlyNewsletterLabel')} defaultChecked={!!editing?.newsletter} />
                </div>

                <div>
                  <div className="text-sm font-semibold text-gray-800 mb-1">{t('outreachPlan')}</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <Checkbox name="jan1" label={t('sendJan1')} defaultChecked={editing?.outreachPlan?.jan1 ?? true} />
                    <Checkbox name="feb1" label={t('sendFeb1')} defaultChecked={editing?.outreachPlan?.feb1 ?? true} />
                    <Checkbox name="mar1" label={t('sendMar1')} defaultChecked={editing?.outreachPlan?.mar1 ?? true} />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="submit" className="bg-indigo-800 text-white px-5 py-2 rounded-xl font-bold shadow hover:bg-indigo-900">
                    {editing ? t('saveChanges') : t('addOepClient')}
                  </button>
                  <button type="button" onClick={() => setAddOpen(false)} className="bg-gray-100 text-gray-700 px-5 py-2 rounded-xl hover:bg-gray-200">
                    {t('cancel')}
                  </button>
                </div>

                <div className="text-xs text-gray-500">
                  {t('cohortWindowNote', { start: season.cohortStart.toLocaleDateString(), end: season.cohortEnd.toLocaleDateString() })}
                </div>
              </form>
            </Modal>
          )}
        </section>
      </div>

      {/* TEMPLATE PREVIEW MODAL */}
      {previewTemplate && (
        <Modal onClose={() => setPreviewTemplate(null)} title={`${previewTemplate.title || t(previewTemplate.titleKey)} ${t('preview')}`}>
          <pre className="bg-indigo-50 rounded p-4 whitespace-pre-wrap mb-4 text-gray-900 text-sm">
            {previewTemplate.subject && `Subject: ${previewTemplate.subject}\n\n`}{previewTemplate.content}
          </pre>
          <div className="text-sm font-semibold mb-1">{t('personalizationExample')}</div>
          <pre className="bg-indigo-100 rounded p-4 whitespace-pre-wrap text-indigo-800 text-sm">
            {((previewTemplate.subject ? `Subject: ${previewTemplate.subject}\n\n` : "") + previewTemplate.content)
              .replaceAll("{ClientName}", "Jane Albright")
              .replaceAll("{AgentName}", "Scott Fluegel")
              .replaceAll("{AgentPhone}", "(859) 555-1234")
              .replaceAll("{PolicyYear}", String(season.seasonYear))}
          </pre>
          <div className="flex gap-3 mt-4">
            <button className="bg-indigo-800 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-indigo-900" onClick={() => handleTestSend(previewTemplate.content)}>
              {t('testSend')} (demo)
            </button>
            <button className="bg-green-700 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-green-800" onClick={() => handleInsertTemplate(previewTemplate)}>
              {t('insert')}
            </button>
            <button className="bg-gray-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-gray-700" onClick={() => { setPreviewTemplate(null); handleEditTemplate(previewTemplate); }}>
              <Edit2 size={14} className="inline -mt-0.5 mr-1" />
              Edit
            </button>
          </div>
          <div className="mt-4">
            <div className="text-xs text-gray-600 mb-2">{t('mergeTags')}:</div>
            <div className="flex flex-wrap gap-2">
              {MERGE_TAGS.map((tag, i) => (
                <span key={i} className="bg-indigo-100 px-3 py-1 rounded-full font-mono text-xs text-indigo-900">
                  {tag.tag} <span className="text-gray-500">({tag.label})</span>
                </span>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* TEMPLATE LIBRARY MODAL */}
      {templateLibraryOpen && (
        <Modal onClose={() => setTemplateLibraryOpen(false)} title="Template Library" wide>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 flex-1">
              <Filter size={16} className="text-gray-400" />
              <input
                type="text"
                className="rounded-lg border px-3 py-2 text-sm flex-1"
                placeholder="Search templates..."
                value={searchTemplate}
                onChange={(e) => setSearchTemplate(e.target.value)}
              />
            </div>
            <button
              onClick={handleCreateTemplate}
              className="ml-4 bg-green-600 text-white px-4 py-2 rounded-xl font-bold shadow hover:bg-green-700"
            >
              <Plus size={16} className="inline -mt-0.5 mr-1" />
              New Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
            {templates
              .filter(
                (tpl) =>
                  (tpl.title || t(tpl.titleKey) || "").toLowerCase().includes(searchTemplate.toLowerCase()) ||
                  tpl.tags.join(" ").toLowerCase().includes(searchTemplate.toLowerCase())
              )
              .map((tpl, i) => (
                <div key={tpl.id || i} className="p-4 rounded-2xl border hover:border-indigo-300 transition bg-white shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-bold text-gray-900">
                        {tpl.title || t(tpl.titleKey)}
                      </div>
                      <div className="text-xs text-indigo-500">{tpl.type}</div>
                    </div>
                    {tpl.featured && (
                      <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">Featured</span>
                    )}
                  </div>
                  {tpl.subject && (
                    <div className="text-xs text-gray-500 mb-2 truncate">Subject: {tpl.subject}</div>
                  )}
                  <div className="text-xs text-gray-600 mb-3 line-clamp-3">
                    {tpl.content.slice(0, 100)}...
                  </div>
                  <div className="flex gap-1 mb-3 flex-wrap">
                    {tpl.tags.map((tag, j) => (
                      <span key={j} className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded text-xs font-medium"
                      onClick={() => { setTemplateLibraryOpen(false); handlePreviewTemplate(tpl); }}
                    >
                      <Eye size={14} className="inline -mt-0.5 mr-1" />
                      Preview
                    </button>
                    <button
                      className="text-green-700 hover:bg-green-50 px-2 py-1 rounded text-xs font-medium"
                      onClick={() => { setTemplateLibraryOpen(false); handleEditTemplate(tpl); }}
                    >
                      <Edit2 size={14} className="inline -mt-0.5 mr-1" />
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs font-medium"
                      onClick={() => handleDeleteTemplate(tpl.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </Modal>
      )}

      {/* TEMPLATE EDIT MODAL */}
      {editingTemplate && (
        <Modal onClose={() => setEditingTemplate(null)} title={editingTemplate.id ? "Edit Template" : "Create Template"}>
          <form onSubmit={handleSaveTemplate} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Title</label>
              <input
                type="text"
                className="w-full border rounded-lg p-2"
                value={editingTemplate.title || ""}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Type</label>
                <select
                  className="w-full border rounded-lg p-2"
                  value={editingTemplate.type || "Email"}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, type: e.target.value })}
                >
                  <option value="Email">Email</option>
                  <option value="SMS">SMS</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    checked={editingTemplate.featured || false}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, featured: e.target.checked })}
                  />
                  <span className="text-sm font-semibold text-gray-800">Featured</span>
                </label>
              </div>
            </div>
            {editingTemplate.type === "Email" && (
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Subject</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2"
                  value={editingTemplate.subject || ""}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Content</label>
              <textarea
                className="w-full border rounded-lg p-2 h-40"
                value={editingTemplate.content || ""}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                className="w-full border rounded-lg p-2"
                value={(editingTemplate.tags || []).join(", ")}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-indigo-800 text-white px-5 py-2 rounded-xl font-bold shadow hover:bg-indigo-900"
              >
                Save Template
              </button>
              <button type="button" onClick={() => setEditingTemplate(null)} className="bg-gray-100 text-gray-700 px-5 py-2 rounded-xl hover:bg-gray-200">
                Cancel
              </button>
            </div>
            <div className="mt-4 text-xs text-gray-600">
              <div className="font-semibold mb-1">Available merge tags:</div>
              <div className="flex flex-wrap gap-2">
                {MERGE_TAGS.map((tag, i) => (
                  <code key={i} className="bg-gray-100 px-2 py-0.5 rounded">{tag.tag}</code>
                ))}
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* -------------------- tiny components -------------------- */

function KPI({ label, value, icon }) {
  return (
    <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
      <div className="text-sm text-indigo-100">{label}</div>
      <div className="flex items-center gap-2">
        <div className="text-2xl font-extrabold">{value}</div>
        <div className="opacity-90">{icon}</div>
      </div>
      <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
        <div className="h-2 bg-yellow-300 rounded-full" style={{ width: typeof value === "number" ? (Math.min(100, value) + "%") : "40%" }} />
      </div>
    </div>
  );
}

function ToggleCard({ label, on, onClick }) {
  return (
    <button
      className={`p-4 rounded-2xl border text-left transition shadow-sm ${on ? "bg-indigo-50 border-indigo-300" : "bg-white border-gray-200"}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="font-semibold text-gray-900">{label}</div>
        <div className={`w-12 h-6 rounded-full px-0.5 flex items-center ${on ? "bg-indigo-600 justify-end" : "bg-gray-300 justify-start"}`}>
          <div className="w-5 h-5 bg-white rounded-full shadow" />
        </div>
      </div>
    </button>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl ${wide ? 'w-full max-w-5xl' : 'w-full max-w-3xl'} shadow-xl relative max-h-[90vh] overflow-y-auto`}>
        <button className="absolute top-3 right-4 text-gray-400 text-2xl" onClick={onClose}>
          &times;
        </button>
        <div className="p-6">
          {title && <h2 className="text-xl font-bold text-indigo-900 mb-4">{title}</h2>}
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
      <input name={name} type={type} defaultValue={defaultValue} required={required} className="block w-full border rounded-lg p-2 mt-1" />
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
