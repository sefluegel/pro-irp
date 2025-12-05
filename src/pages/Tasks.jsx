// src/pages/Tasks.jsx  (wording: "All Tasks" & "My Tasks")
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

// ---------- tiny API helpers (self-contained) ----------
const BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";
const authHeaders = () => {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
};
async function j(method, url, body) {
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${await res.text()}`);
  return res.json();
}
const listAll = (params = {}) => j("GET", `/tasks/all${qs(params)}`);   // All Tasks = My + Client-linked
const listMine = (params = {}) => j("GET", `/tasks${qs(params)}`);      // My Tasks only (not linked to a client)
const summary = () => j("GET", "/tasks/summary");
const patchMine = (id, p) => j("PATCH", `/tasks/${id}`, p);
const delMine = (id) => j("DELETE", `/tasks/${id}`);
const createMine = (p) => j("POST", "/tasks", p);
const createClient = (cid, p) => j("POST", `/tasks/clients/${cid}`, p);
const patchClient = (cid, tid, p) => j("PATCH", `/tasks/clients/${cid}/${tid}`, p);
const getClients = () => j("GET", "/clients");
function qs(o) {
  const q = new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([,v]) => v!=null && v!==""))).toString();
  return q ? `?${q}` : "";
}

// ---------- date helpers ----------
const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

// ---------- small UI atoms ----------
const Pill = ({ active, onClick, children }) => (
  <button
    className={`px-3 py-1 rounded-full border text-sm ${active ? "bg-black text-white" : "bg-white hover:bg-gray-50"}`}
    onClick={onClick}
  >
    {children}
  </button>
);

function Row({ task, selected, onSelect, onToggle, onDelete, t }) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const readOnly = !!task.clientId; // My Tasks editable here; client-linked tasks edited on the Client Profile
  return (
    <div className="grid grid-cols-12 items-center gap-3 px-3 py-3 bg-white">
      <div className="col-span-1 flex items-center gap-2">
        <input type="checkbox" className="w-4 h-4" checked={selected} onChange={() => onSelect(task)} />
        <button
          className={`w-4 h-4 rounded-full border ${task.status === "done" ? "bg-black" : "bg-white"} ${readOnly ? "opacity-40 cursor-not-allowed" : ""}`}
          title={readOnly ? t('clientLinkedTasksNote') : t('toggleDone')}
          onClick={() => !readOnly && onToggle(task)}
          disabled={readOnly}
        />
      </div>
      <div className="col-span-5">
        <div className={`font-medium ${task.status === "done" ? "line-through text-gray-500" : ""}`}>{task.title}</div>
        <div className="text-xs text-gray-500">
          {task.clientId ? (task.clientName ? `${t('client')}: ${task.clientName}` : t('clientLinked')) : t('myTask')}
        </div>
        {task.notes ? <div className="text-sm text-gray-500">{task.notes}</div> : null}
      </div>
      <div className="col-span-2 text-sm">
        <span className={`px-2 py-1 text-xs rounded-full border ${task.priority === "high" ? "bg-red-50 border-red-200" : task.priority === "low" ? "bg-gray-50" : "bg-blue-50 border-blue-200"}`}>
          {t(task.priority || "normal")}
        </span>
      </div>
      <div className="col-span-2 text-sm">{due ? due.toLocaleString() : <span className="text-gray-400">—</span>}</div>
      <div className="col-span-2 text-right">
        {!task.clientId && (
          <button className="px-3 py-1 rounded-xl hover:bg-gray-100" onClick={() => onDelete(task)}>
            {t('delete')}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- simple modal (self-contained) ----------
function Modal({ open, title, children, onClose, onSave, t }) {
  const [saving, setSaving] = useState(false);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">
        <div className="font-bold text-lg mb-2">{title}</div>
        <div className="mb-4">{children}</div>
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded-xl" onClick={onClose} disabled={saving}>{t('cancel')}</button>
          <button
            className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60"
            onClick={async () => { setSaving(true); await onSave(); setSaving(false); }}
            disabled={saving}
          >
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================================================
//                    MAIN ROUTE
// ===================================================
export default function Tasks() {
  const { t } = useTranslation();
  const [scope, setScope] = useState("all"); // "all" (All Tasks) or "mine" (My Tasks only)
  const [tab, setTab] = useState("all");     // all | dueToday | upcoming | overdue | completed
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [clients, setClients] = useState([]);

  const now = new Date();

  // Load clients for dropdown
  useEffect(() => {
    async function loadClients() {
      try {
        const res = await getClients();
        setClients(res.data || []);
      } catch (err) {
        console.error('Failed to load clients:', err);
      }
    }
    loadClients();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const params = { q: query || "" };
      const res = scope === "all" ? await listAll(params) : await listMine(params);
      setItems(res.data || []);
      try { const s = await summary(); setSummaryData(s.data); } catch {}
      setSelected([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const onAnyTaskChange = () => refresh();
    window.addEventListener("tasks:update", onAnyTaskChange);
    return () => window.removeEventListener("tasks:update", onAnyTaskChange);
  }, [scope]);

  const filtered = useMemo(() => {
    if (!query) return items;
    const s = query.toLowerCase();
    return items.filter((t) =>
      (t.title || "").toLowerCase().includes(s) ||
      (t.notes || "").toLowerCase().includes(s) ||
      (t.status || "").toLowerCase().includes(s) ||
      (t.priority || "").toLowerCase().includes(s) ||
      (t.clientName || "").toLowerCase().includes(s)
    );
  }, [items, query]);

  const buckets = useMemo(() => {
    const overdue = [], dueToday = [], upcoming = [], completed = [];
    for (const t of filtered) {
      if (t.status === "done") { completed.push(t); continue; }
      if (!t.dueDate) { upcoming.push(t); continue; }
      const d = new Date(t.dueDate);
      if (d < startOfDay(now)) overdue.push(t);
      else if (sameDay(d, now)) dueToday.push(t);
      else upcoming.push(t);
    }
    return { overdue, dueToday, upcoming, completed };
  }, [filtered]);

  function visibleRows() {
    if (tab === "overdue") return buckets.overdue;
    if (tab === "dueToday") return buckets.dueToday;
    if (tab === "upcoming") return buckets.upcoming;
    if (tab === "completed") return buckets.completed;
    return filtered;
  }

  function toggleSelect(task) {
    setSelected((cur) =>
      cur.find((x) => x.id === task.id) ? cur.filter((x) => x.id !== task.id) : [...cur, task]
    );
  }

  async function toggleDone(task) {
    if (task.clientId) {
      await patchClient(task.clientId, task.id, { status: task.status === "done" ? "todo" : "done" });
    } else {
      await patchMine(task.id, { status: task.status === "done" ? "todo" : "done" });
    }
    window.dispatchEvent(new CustomEvent("tasks:update"));
  }

  async function bulkComplete() {
    for (const t of selected) {
      if (t.status !== "done") {
        if (t.clientId) await patchClient(t.clientId, t.id, { status: "done" });
        else await patchMine(t.id, { status: "done" });
      }
    }
    window.dispatchEvent(new CustomEvent("tasks:update"));
  }

  async function deleteOne(task) {
    if (task.clientId) return; // keep client-linked tasks immutable here
    await delMine(task.id);
    window.dispatchEvent(new CustomEvent("tasks:update"));
  }

  // ---- create task modal state ----
  const [newTask, setNewTask] = useState({ title: "", notes: "", priority: "normal", dueDate: "", clientId: "" });
  async function saveNewTask() {
    const payload = {
      title: newTask.title.trim(),
      notes: newTask.notes.trim(),
      priority: newTask.priority,
      dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null,
    };
    if (!payload.title) return;

    // Create client task or global task based on clientId selection
    if (newTask.clientId) {
      await createClient(newTask.clientId, payload);
    } else {
      await createMine(payload);
    }

    setCreateOpen(false);
    setNewTask({ title: "", notes: "", priority: "normal", dueDate: "", clientId: "" });
    window.dispatchEvent(new CustomEvent("tasks:update"));
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{t('tasks')}</h1>
          {summaryData && (
            <div className="mt-1 text-sm text-gray-600">
              {t('allTasksSummary', { all: summaryData.all.total, mine: summaryData.global.total })}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded-2xl border ${scope === "all" ? "bg-black text-white" : "bg-white"}`}
            onClick={() => setScope("all")}
          >
            {t('allTasks')}
          </button>
          <button
            className={`px-4 py-2 rounded-2xl border ${scope === "mine" ? "bg-black text-white" : "bg-white"}`}
            onClick={() => setScope("mine")}
          >
            {t('myTasksOnly')}
          </button>
          <button
            className="px-4 py-2 rounded-2xl bg-black text-white"
            onClick={() => setCreateOpen(true)}
            title="Creates a task not linked to a client"
          >
            + {t('addTask')}
          </button>
          <button className="px-4 py-2 rounded-2xl border" onClick={bulkComplete} disabled={selected.length === 0}>
            {t('complete')}
          </button>
          <button className="px-4 py-2 rounded-2xl border" onClick={() => setSelected([])} disabled={selected.length === 0}>
            {t('clear')}
          </button>
        </div>
      </div>

      {/* Tabs & search */}
      <div className="flex items-center gap-2 mb-3">
        <Pill active={tab === "all"} onClick={() => setTab("all")}>{t('all')}</Pill>
        <Pill active={tab === "dueToday"} onClick={() => setTab("dueToday")}>{t('dueToday')}</Pill>
        <Pill active={tab === "upcoming"} onClick={() => setTab("upcoming")}>{t('upcoming')}</Pill>
        <Pill active={tab === "overdue"} onClick={() => setTab("overdue")}>{t('overdue')}</Pill>
        <Pill active={tab === "completed"} onClick={() => setTab("completed")}>{t('completed')}</Pill>
        <div className="ml-auto">
          <input
            className="border rounded-2xl px-3 py-2 w-64"
            placeholder={t('searchTasks')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && refresh()}
          />
        </div>
      </div>

      {/* Grouped sections when tab=All */}
      {loading ? (
        <div className="text-gray-500">{t('loading')}</div>
      ) : tab === "all" ? (
        <div className="space-y-6">
          <Section tone="red" title={t('overdue')} count={buckets.overdue.length} t={t}>
            {buckets.overdue.map((task) => (
              <Row key={task.id} task={task} selected={!!selected.find(x=>x.id===task.id)} onSelect={toggleSelect} onToggle={toggleDone} onDelete={deleteOne} t={t} />
            ))}
          </Section>
          <Section tone="yellow" title={t('dueToday')} count={buckets.dueToday.length} t={t}>
            {buckets.dueToday.map((task) => (
              <Row key={task.id} task={task} selected={!!selected.find(x=>x.id===task.id)} onSelect={toggleSelect} onToggle={toggleDone} onDelete={deleteOne} t={t} />
            ))}
          </Section>
          <Section tone="gray" title={t('upcoming')} count={buckets.upcoming.length} t={t}>
            {buckets.upcoming.map((task) => (
              <Row key={task.id} task={task} selected={!!selected.find(x=>x.id===task.id)} onSelect={toggleSelect} onToggle={toggleDone} onDelete={deleteOne} t={t} />
            ))}
          </Section>
          <Section tone="green" title={t('completed')} count={buckets.completed.length} t={t}>
            {buckets.completed.map((task) => (
              <Row key={task.id} task={task} selected={!!selected.find(x=>x.id===task.id)} onSelect={toggleSelect} onToggle={toggleDone} onDelete={deleteOne} t={t} />
            ))}
          </Section>
        </div>
      ) : (
        <div className="space-y-2">
          {(() => {
            const visible =
              tab === "overdue" ? buckets.overdue :
              tab === "dueToday" ? buckets.dueToday :
              tab === "upcoming" ? buckets.upcoming :
              tab === "completed" ? buckets.completed : filtered;
            return visible.length === 0 ? (
              <div className="text-gray-500">{t('noTasksMatch')}</div>
            ) : (
              visible.map((task) => (
                <Row key={task.id} task={task} selected={!!selected.find(x=>x.id===task.id)} onSelect={toggleSelect} onToggle={toggleDone} onDelete={deleteOne} t={t} />
              ))
            );
          })()}
        </div>
      )}

      {/* Create Task */}
      <Modal open={createOpen} title={newTask.clientId ? t('newClientTask') : t('newTask')} onClose={() => setCreateOpen(false)} onSave={saveNewTask} t={t}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t('linkToClient')}</label>
            <select
              className="border rounded-xl px-3 py-2 w-full"
              value={newTask.clientId}
              onChange={(e)=>setNewTask(v=>({...v,clientId:e.target.value}))}
            >
              <option value="">{t('noClientPersonalTask')}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} {c.email ? `(${c.email})` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {newTask.clientId ? t('taskLinkedToClient') : t('personalTaskNotLinked')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium">{t('title')}</label>
            <input className="border rounded-xl px-3 py-2 w-full" value={newTask.title} onChange={(e)=>setNewTask(v=>({...v,title:e.target.value}))}/>
          </div>
          <div>
            <label className="block text-sm font-medium">{t('notes')}</label>
            <textarea className="border rounded-xl px-3 py-2 w-full" rows={3} value={newTask.notes} onChange={(e)=>setNewTask(v=>({...v,notes:e.target.value}))}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">{t('priority')}</label>
              <select className="border rounded-xl px-3 py-2 w-full" value={newTask.priority} onChange={(e)=>setNewTask(v=>({...v,priority:e.target.value}))}>
                <option value="low">{t('low')}</option>
                <option value="normal">{t('normal')}</option>
                <option value="high">{t('high')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">{t('due')}</label>
              <input type="datetime-local" className="border rounded-xl px-3 py-2 w-full" value={newTask.dueDate}
                onChange={(e)=>setNewTask(v=>({...v,dueDate:e.target.value}))}/>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------- Section wrapper ----------
function Section({ title, count, tone, children, t }) {
  const tones = {
    red: "bg-red-50 border-red-200",
    yellow: "bg-yellow-50 border-yellow-200",
    gray: "bg-gray-50 border-gray-200",
    green: "bg-green-50 border-green-200",
  };
  return (
    <div>
      <div className="font-semibold mb-2 flex items-center gap-2">
        {title} <span className="text-gray-500 text-sm">{count ? t('tasksCount', { count }) : ""}</span>
      </div>
      <div className={`rounded-2xl border ${tones[tone] || "bg-white border-gray-200"}`}>{children}</div>
    </div>
  );
}
