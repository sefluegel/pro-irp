// /src/pages/Automations.jsx

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus, Zap, Mail, MessageSquare, Calendar, Info, User, UserPlus,
  Repeat, Eye, Send, Download, CheckCircle2, XCircle, AlertCircle,
  RefreshCw, Edit2, ClipboardList, BookOpen, HelpCircle, Star, ArrowUpRight
} from "lucide-react";

// ========== Sample Data ==========

const DEFAULT_AUTOMATIONS = [
  {
    key: "birthday",
    labelKey: "birthdayTextEmail",
    descriptionKey: "sendsHappyBirthday",
    enabled: true,
    icon: <Calendar className="w-5 h-5 text-blue-500" />,
  },
  {
    key: "anniversary",
    labelKey: "policyAnniversary",
    descriptionKey: "annualCheckInReminder",
    enabled: true,
    icon: <Mail className="w-5 h-5 text-purple-500" />,
  },
  {
    key: "monthly_newsletter",
    labelKey: "monthlyNewsletter",
    descriptionKey: "sendsMonthlyUpdates",
    enabled: false,
    icon: <Mail className="w-5 h-5 text-yellow-500" />,
  },
  {
    key: "anoc",
    labelKey: "anocExplainer",
    descriptionKey: "aepReminder",
    enabled: true,
    icon: <Info className="w-5 h-5 text-pink-500" />,
  },
  {
    key: "rx_change",
    labelKey: "oepFollowUp",
    descriptionKey: "janOepCheckin",
    enabled: true,
    icon: <MessageSquare className="w-5 h-5 text-red-500" />,
  },
  {
    key: "plan_switch",
    labelKey: "renewalReminder",
    descriptionKey: "daysBeforeRenewal",
    enabled: false,
    icon: <Zap className="w-5 h-5 text-green-500" />,
  },
  {
    key: "inactivity",
    labelKey: "oepFollowUp",
    descriptionKey: "janOepCheckin",
    enabled: false,
    icon: <MessageSquare className="w-5 h-5 text-indigo-500" />,
  },
  {
    key: "custom_workflow",
    labelKey: "newWorkflow",
    descriptionKey: "automationsComingSoon",
    enabled: false,
    icon: <Plus className="w-5 h-5 text-gray-500" />,
  },
];

const DEFAULT_TEMPLATES = [
  {
    titleKey: "birthdayTemplate",
    type: "Email",
    content:
      "Subject: Happy Birthday from Your Medicare Agent!\n\nDear {ClientName},\n\nWishing you a wonderful birthday! If you have questions about your Medicare plan or want a review, I'm here to help.\n\nBest,\n{AgentName}",
    tags: ["Birthday", "Personal"],
    featured: true,
  },
  {
    titleKey: "anniversaryTemplate",
    type: "Email",
    content:
      "Subject: Time for Your Annual Policy Review\n\nHi {ClientName},\n\nIt's time for your annual Medicare policy review. Let's schedule a quick chat to ensure your plan still fits your needs.\n\nBest,\n{AgentName}",
    tags: ["Anniversary", "Policy"],
  },
  {
    titleKey: "aepTemplate",
    type: "Email",
    content:
      "Subject: Important Changes to Your Medicare Plan\n\nHi {ClientName},\n\nThe Annual Notice of Change (ANOC) for your Medicare plan is here. Let's connect soon if you have questions or want to discuss your options.\n\nBest,\n{AgentName}",
    tags: ["ANOC", "Change"],
  },
  {
    titleKey: "oepTemplate",
    type: "SMS",
    content:
      "Hi {ClientName}, just checking in! Haven't heard from you in a while—if you have any questions about your Medicare coverage, I'm here for you. —{AgentName}",
    tags: ["Inactivity", "SMS"],
  },
];

const DEFAULT_ACTIVITY = [
  {
    time: "2 mins ago",
    type: "Email",
    to: "jane.smith@email.com",
    subject: "Happy Birthday from Your Medicare Agent!",
    status: "delivered",
    automation: "Birthday",
  },
  {
    time: "1 hr ago",
    type: "SMS",
    to: "+1 (859) 555-0198",
    subject: "—",
    status: "failed",
    automation: "Re-Engagement",
    error: "Phone unreachable",
  },
  {
    time: "Today, 7:00 AM",
    type: "Email",
    to: "tim.doe@email.com",
    subject: "Important Changes to Your Medicare Plan",
    status: "opened",
    automation: "ANOC Notice",
  },
  {
    time: "Yesterday",
    type: "Email",
    to: "alex@email.com",
    subject: "Time for Your Annual Policy Review",
    status: "delivered",
    automation: "Policy Review",
  },
];

// Personalization tags for preview/demo
const TAGS = [
  { labelKey: "clientName", tag: "{ClientName}", sample: "Jane Smith" },
  { labelKey: "agentName", tag: "{AgentName}", sample: "Scott Fluegel" },
  { labelKey: "agentPhone", tag: "{AgentPhone}", sample: "(859) 555-1234" },
  { labelKey: "policyYear", tag: "{PolicyYear}", sample: "2025" },
];

// Analytics (fake numbers)
const ANALYTICS = [
  { labelKey: "automationsSent", value: 1802, icon: <Send className="w-6 h-6" /> },
  { labelKey: "openRate", value: "62%", icon: <Eye className="w-6 h-6" /> },
  { labelKey: "clickRate", value: "21%", icon: <ArrowUpRight className="w-6 h-6" /> },
  { labelKey: "replyRate", value: "17%", icon: <MessageSquare className="w-6 h-6" /> },
  { labelKey: "bounces", value: "14", icon: <AlertCircle className="w-6 h-6" /> },
  { labelKey: "failedSends", value: "8", icon: <XCircle className="w-6 h-6" /> },
];

// AI prompt examples
const AI_EXAMPLES = [
  "Draft a re-engagement text for inactive clients.",
  "Create a subject line for the October newsletter.",
  "Summarize ANOC changes in simple language.",
  "Suggest a Medicare compliance reminder.",
];

export default function Automations() {
  const { t } = useTranslation();
  const [automations, setAutomations] = useState(DEFAULT_AUTOMATIONS);
  const [activity, setActivity] = useState(DEFAULT_ACTIVITY);
  const [analytics] = useState(ANALYTICS);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [showWorkflowForm, setShowWorkflowForm] = useState(false);
  const [workflowName, setWorkflowName] = useState("");
  const [workflowTriggers, setWorkflowTriggers] = useState([]);
  const [workflowActions, setWorkflowActions] = useState("");
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { sender: "ai", text: t('askAboutAutomations') },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [searchTemplate, setSearchTemplate] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  function handleToggleAutomation(idx) {
    setAutomations((prev) =>
      prev.map((a, i) =>
        i === idx ? { ...a, enabled: !a.enabled } : a
      )
    );
  }
  function handleAddWorkflow(e) {
    e.preventDefault();
    setShowWorkflowForm(false);
    setWorkflowName("");
    setWorkflowTriggers([]);
    setWorkflowActions("");
    alert("Workflow created (stub).");
  }
  function handleAiSend(e) {
    e.preventDefault();
    if (!aiInput.trim()) return;
    setAiMessages((prev) => [...prev, { sender: "user", text: aiInput }]);
    setTimeout(() => {
      setAiMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text:
            aiInput.toLowerCase().includes("birthday")
              ? "Here's a sample birthday email:\n\nSubject: Happy Birthday from Your Medicare Agent!\n\nDear {ClientName},\n\nWishing you a very happy birthday! If you have questions about your plan or want to review your coverage, let me know.\n\nBest,\n{AgentName}"
              : "I've got your request! (This assistant can draft emails, suggest automations, explain features, and more. For full functionality, connect to the OpenAI API.)",
        },
      ]);
    }, 900);
    setAiInput("");
  }
  function handleResend(idx) {
    setActivity((prev) =>
      prev.map((a, i) =>
        i === idx ? { ...a, status: "delivered", error: undefined } : a
      )
    );
  }
  function handleTestSend(content) {
    alert("Test send simulated!\n\n" +
      content.replaceAll("{ClientName}", "Jane Smith").replaceAll("{AgentName}", "Scott Fluegel"));
  }
  function handlePreviewTemplate(tpl) {
    setPreviewTemplate(tpl);
  }
  function handleInsertTemplate(tpl) {
    setShowWorkflowForm(false);
    setWorkflowActions(tpl.content);
    setPreviewTemplate(null);
  }
  function handleSearchTemplate(e) {
    setSearchTemplate(e.target.value);
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100 flex flex-col font-sans">

      {/* HEADER */}
      <div className="flex items-center justify-between p-6 border-b bg-white/70 backdrop-blur">
        <div className="flex items-center gap-4">
          <Zap className="w-8 h-8 text-blue-800" />
          <h1 className="text-3xl font-black tracking-tight text-blue-900">{t('automationsWorkflows')}</h1>
        </div>
        <div className="flex gap-3">
          <button className="bg-blue-800 text-white px-5 py-2 rounded-2xl font-semibold shadow hover:bg-blue-900 transition"
            onClick={() => setShowWorkflowForm(true)}>
            <Plus className="inline-block mr-1 -mt-1" size={18} /> {t('newWorkflow')}
          </button>
          <button className="bg-white border border-blue-200 text-blue-900 px-4 py-2 rounded-2xl font-semibold hover:bg-blue-50"
            onClick={() => setShowHelp(v => !v)}>
            <HelpCircle className="inline-block mr-1 -mt-1" size={18} /> {t('help')}
          </button>
        </div>
      </div>

      {/* HELP MODAL */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-xl w-full shadow-xl relative">
            <button className="absolute top-2 right-4 text-gray-400 text-2xl" onClick={() => setShowHelp(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-4 text-blue-900 flex items-center gap-2"><HelpCircle /> {t('automationHelpTips')}</h2>
            <ul className="space-y-2 text-base text-gray-700">
              <li><strong>{t('toggleAutomations')}</strong></li>
              <li><strong>{t('addWorkflows')}</strong></li>
              <li>{t('usePersonalizationTags')} <span className="bg-blue-100 px-1 rounded">{TAGS[0].tag}</span></li>
              <li><strong>{t('previewAndTestSend')}</strong></li>
              <li><strong>{t('aiAssistantCanHelp')}</strong></li>
              <li>{t('checkActivityFeed')}</li>
              <li>{t('seeStatsInAnalytics')}</li>
            </ul>
          </div>
        </div>
      )}

      {/* PAGE BODY */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 flex-1 px-6 py-8">

        {/* AUTOMATION LIST (Left column) */}
        <div className="xl:col-span-2 flex flex-col gap-8">
          <section>
            <h2 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2"><ClipboardList /> {t('myAutomations')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {automations.map((a, idx) => (
                <div key={a.key} className={`bg-white rounded-2xl shadow flex flex-col gap-3 p-5 border-t-4 transition
                ${a.enabled ? "border-blue-500" : "border-gray-200 opacity-70"}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-50">{a.icon}</div>
                    <div>
                      <h3 className="font-bold text-gray-900">{t(a.labelKey)}</h3>
                      <p className="text-xs text-gray-500">{t(a.descriptionKey)}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-400">{a.enabled ? t('active') : t('inactive')}</span>
                    <button className={`w-14 h-7 rounded-full flex items-center px-1 transition
                      ${a.enabled ? "bg-blue-500" : "bg-gray-200"}`}
                      onClick={() => handleToggleAutomation(idx)}>
                      <span className={`h-5 w-5 bg-white rounded-full shadow transition`}
                        style={{
                          transform: a.enabled
                            ? "translateX(18px)"
                            : "translateX(0px)",
                        }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ACTIVITY FEED & ANALYTICS (Middle) */}
        <div className="xl:col-span-2 flex flex-col gap-8">
          <section>
            <h2 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2"><Repeat /> {t('activityFeed')}</h2>
            <div className="bg-white rounded-2xl shadow p-4 max-h-72 overflow-y-auto">
              {activity.map((a, idx) => (
                <div key={idx} className="flex justify-between items-center border-b last:border-b-0 py-3">
                  <div>
                    <div className="text-sm font-bold text-gray-800">{a.automation}</div>
                    <div className="text-xs text-gray-500">{a.time} &bull; {a.type} &bull; {a.to}</div>
                    <div className="text-xs text-gray-400">{a.subject !== "—" ? a.subject : null}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.status === "delivered" && <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={16} /> {t('delivered')}</span>}
                    {a.status === "opened" && <span className="text-blue-600 flex items-center gap-1"><Eye size={16} /> {t('opened')}</span>}
                    {a.status === "failed" && (
                      <>
                        <span className="text-red-600 flex items-center gap-1"><XCircle size={16} /> {t('failed')}</span>
                        <button className="text-blue-700 underline text-xs" onClick={() => handleResend(idx)}>
                          <RefreshCw size={14} className="inline-block mr-1" /> {t('resend')}
                        </button>
                        <span className="text-xs text-red-400">{a.error}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-2 text-xs text-blue-900 flex items-center gap-1 hover:underline">
              <Download size={16} /> {t('exportActivityCsv')}
            </button>
          </section>
          <section>
            <h2 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2"><BookOpen /> {t('analytics')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {analytics.map((a, i) => (
                <div key={i} className="bg-white rounded-2xl shadow flex flex-col items-center justify-center p-4">
                  <div className="mb-1">{a.icon}</div>
                  <div className="text-xl font-black text-blue-800">{a.value}</div>
                  <div className="text-xs text-gray-600">{t(a.labelKey)}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* TEMPLATES, PREVIEW, AI (Right) */}
        <div className="xl:col-span-1 flex flex-col gap-8">
          {/* TEMPLATES */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-blue-800 flex items-center gap-2"><Star /> {t('templates')}</h2>
              <input
                type="text"
                className="rounded-lg border px-2 py-1 text-xs"
                placeholder={t('searchTemplates')}
                value={searchTemplate}
                onChange={handleSearchTemplate}
                style={{width: 120}}
              />
            </div>
            <div className="bg-white rounded-2xl shadow max-h-60 overflow-y-auto divide-y">
              {templates.filter(tpl =>
                t(tpl.titleKey).toLowerCase().includes(searchTemplate.toLowerCase())
                || tpl.tags.join(" ").toLowerCase().includes(searchTemplate.toLowerCase())
              ).map((tpl, i) => (
                <div key={i} className="p-4 hover:bg-blue-50 group">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900">{t(tpl.titleKey)} <span className="text-xs text-blue-400">({tpl.type})</span></div>
                      <div className="flex gap-1 mt-1">
                        {tpl.tags.map((tag, j) => <span key={j} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{tag}</span>)}
                        {tpl.featured && <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">{t('featured')}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-blue-700 hover:underline text-xs" onClick={() => handlePreviewTemplate(tpl)}><Eye size={16}/> {t('preview')}</button>
                      <button className="text-green-700 hover:underline text-xs" onClick={() => handleInsertTemplate(tpl)}><Plus size={16}/> {t('insert')}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          {/* PREVIEW */}
          {previewTemplate && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-xl relative">
                <button className="absolute top-2 right-4 text-gray-400 text-2xl" onClick={() => setPreviewTemplate(null)}>&times;</button>
                <h2 className="text-xl font-bold mb-2 text-blue-900 flex items-center gap-2"><Eye /> {t(previewTemplate.titleKey)} {t('preview')}</h2>
                <pre className="bg-blue-50 rounded p-4 whitespace-pre-wrap mb-4 text-gray-900 text-sm">{previewTemplate.content}</pre>
                <h3 className="font-semibold mb-2">{t('personalizationExample')}:</h3>
                <pre className="bg-blue-100 rounded p-4 whitespace-pre-wrap text-blue-800 text-sm">{previewTemplate.content.replaceAll("{ClientName}", "Jane Smith").replaceAll("{AgentName}", "Scott Fluegel")}</pre>
                <div className="flex gap-3 mt-4">
                  <button className="bg-blue-800 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-900"
                    onClick={() => handleTestSend(previewTemplate.content)}>
                    <Send className="inline-block mr-1 -mt-1" /> {t('testSend')}
                  </button>
                  <button className="bg-green-700 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-green-800"
                    onClick={() => handleInsertTemplate(previewTemplate)}>
                    <Plus className="inline-block mr-1 -mt-1" /> {t('insertIntoWorkflow')}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* PERSONALIZATION TAGS */}
          <section>
            <h2 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2"><Edit2 /> {t('personalization')}</h2>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((tag, i) => (
                <span key={i} className="bg-blue-100 px-3 py-1 rounded-full font-mono text-xs text-blue-900">
                  {tag.tag}
                  <span className="text-gray-400 ml-1">({t(tag.labelKey)})</span>
                </span>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-2">{t('personalizedForEachClient')}</div>
          </section>
        </div>
      </div>

      {/* NEW WORKFLOW MODAL */}
      {showWorkflowForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <form className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-xl relative"
            onSubmit={handleAddWorkflow}>
            <button className="absolute top-2 right-4 text-gray-400 text-2xl" onClick={() => setShowWorkflowForm(false)} type="button">&times;</button>
            <h2 className="text-xl font-bold mb-4 text-blue-900">{t('createNewWorkflow')}</h2>
            <label className="block mb-3 font-semibold">
              {t('workflowName')}:
              <input className="block w-full border rounded-lg p-2 mt-1"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                required />
            </label>
            <div className="mb-3">
              <span className="font-semibold">{t('triggers')}:</span>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {["Birthday", "Policy Anniversary", "Rx Change", "Plan Switch", "Inactivity (90+ days)", "ANOC/EOC Release", "New Lead Assigned", "Missed Appointment", "Renewal Period", "Custom Trigger"].map(trigger => (
                  <label key={trigger} className="flex gap-2 items-center text-sm">
                    <input
                      type="checkbox"
                      checked={workflowTriggers.includes(trigger)}
                      onChange={() =>
                        setWorkflowTriggers(prev =>
                          prev.includes(trigger)
                            ? prev.filter(t => t !== trigger)
                            : [...prev, trigger]
                        )}
                    />
                    {trigger}
                  </label>
                ))}
              </div>
            </div>
            <label className="block mb-4 font-semibold">
              {t('actionsLabel')}:
              <textarea className="block w-full border rounded-lg p-2 mt-1 min-h-[90px]"
                placeholder={t('actionPlaceholder')}
                value={workflowActions}
                onChange={(e) => setWorkflowActions(e.target.value)}
                required />
            </label>
            <div className="flex gap-3">
              <button type="submit" className="bg-blue-800 text-white px-6 py-2 rounded-xl shadow font-bold hover:bg-blue-900 transition">
                {t('createWorkflow')}
              </button>
              <button className="bg-gray-100 px-6 py-2 rounded-xl text-gray-600 hover:bg-gray-200 transition" type="button"
                onClick={() => setShowWorkflowForm(false)}>{t('cancel')}</button>
            </div>
            <div className="text-xs text-gray-400 mt-3">
              <BookOpen className="inline-block mr-1 -mt-1" /> {t('needInspiration')}
            </div>
          </form>
        </div>
      )}

      {/* AI ASSISTANT CHAT */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
        {aiChatOpen ? (
          <div className="w-80 bg-white shadow-2xl rounded-2xl border border-blue-200 flex flex-col">
            <div className="bg-blue-900 text-white px-4 py-2 rounded-t-2xl flex justify-between items-center">
              <span className="font-semibold">{t('proIrpAssistant')}</span>
              <button className="text-white text-xl" onClick={() => setAiChatOpen(false)} title="Close">×</button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 min-h-[220px] max-h-72">
              {aiMessages.map((m, i) => (
                <div key={i} className={`mb-3 whitespace-pre-line ${m.sender === "ai"
                  ? "text-blue-900 bg-blue-50 p-2 rounded-xl"
                  : "text-right"}`}>{m.text}</div>
              ))}
            </div>
            <form className="border-t flex items-center gap-2 p-2" onSubmit={handleAiSend}>
              <input className="flex-1 rounded-lg border px-3 py-2 text-sm"
                placeholder={t('askMeAnything')}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                autoFocus
              />
              <button className="bg-blue-700 text-white px-3 py-2 rounded-lg hover:bg-blue-900"
                type="submit">{t('send')}</button>
            </form>
            <div className="p-2 text-xs text-gray-400 border-t">
              Try: {AI_EXAMPLES[Math.floor(Math.random() * AI_EXAMPLES.length)]}
            </div>
          </div>
        ) : (
          <button className="bg-blue-800 text-white rounded-full p-4 shadow-2xl flex items-center gap-2 hover:scale-105 transition"
            onClick={() => setAiChatOpen(true)} title="Open Pro IRP Assistant">
            <Zap className="w-5 h-5" />
            <span className="font-bold">{t('askAi')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
