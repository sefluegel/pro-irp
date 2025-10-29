// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const TILE_BASE =
  "flex-1 min-w-[220px] bg-white rounded-2xl shadow ring-1 ring-black/5 px-6 py-5";
const TILE_TITLE = "text-sm text-gray-600";
const TILE_VALUE = "mt-2 text-4xl font-bold tracking-tight text-[#172A3A]";

const CARD_BASE =
  "bg-white rounded-2xl shadow ring-1 ring-black/5 p-5";

const COLORS = ["#1D4ED8", "#60A5FA", "#93C5FD", "#2563EB", "#3B82F6"];

function SectionHeader({ title, note }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="font-semibold text-[#172A3A]">{title}</div>
      {note && <div className="text-xs text-gray-400">{note}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load dashboard basics; all calls are optional-safe.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, t] = await Promise.allSettled([
          api.listClients?.(),
          api.listTasks?.(),
        ]);

        if (!cancelled) {
          setClients(Array.isArray(c.value) ? c.value : []);
          setTasks(Array.isArray(t.value) ? t.value : []);
        }

        // optional: calendar/events if you have one
        try {
          const ev = await api.listEvents?.();
          if (!cancelled && Array.isArray(ev)) setEvents(ev);
        } catch {}

      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ——— Derived metrics ————————————————————————————————————————————————
  const totalClients = clients.length || 0;

  // Retention: if no history, show 92.3% sample (keeps style). Replace later when you have monthly churn data.
  const retentionRate = useMemo(() => {
    if (!clients.length) return { label: "92.3%", sample: true };
    // Extremely simple placeholder calc: Active vs not Active
    const active = clients.filter((c) => (c.status || "Active") === "Active").length;
    const pct = active ? Math.round((active / clients.length) * 1000) / 10 : 0;
    return { label: `${pct.toFixed(1)}%`, sample: false };
  }, [clients]);

  // Churn 30d: if you don’t store churn, show “5” sample to preserve layout
  const churn30 = useMemo(() => {
    // If your backend later exposes /metrics/churn30, swap here.
    return clients.length ? 0 : 5; // placeholder if no data
  }, [clients]);

  const tasksDue = useMemo(() => {
    if (!tasks?.length) return 0;
    const now = new Date();
    return tasks.filter((t) => new Date(t.due || t.date || now) <= now && !t.completed)
      .length;
  }, [tasks]);

  // Line chart data: 12 months; if you lack history, keep your sample curve.
  const retentionSeries = useMemo(() => {
    if (!clients.length) {
      return [
        { m: "Jan", v: 94 },
        { m: "Feb", v: 93 },
        { m: "Mar", v: 95 },
        { m: "Apr", v: 94 },
        { m: "May", v: 96 },
        { m: "Jun", v: 95 },
        { m: "Jul", v: 96 },
        { m: "Aug", v: 95 },
        { m: "Sep", v: 96.2 },
        { m: "Oct", v: 96.8 },
        { m: "Nov", v: 97.3 },
        { m: "Dec", v: 97.5 },
      ];
    }
    // With real history, replace with your monthly retention points.
    // For now, draw a flat line at current retention.
    const v = parseFloat(retentionRate.label);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return months.map((m) => ({ m, v: isNaN(v) ? 95 : v }));
  }, [clients, retentionRate]);

  // Pie chart: churn reasons. If not tracked, show sample distribution matching your UI.
  const churnPie = useMemo(() => {
    // Replace with real reason tallies when you have them
    const sample = [
      { name: "Plan change", value: 42 },
      { name: "Service issues", value: 28 },
      { name: "Moved / eligibility", value: 18 },
      { name: "Other", value: 12 },
    ];
    return sample;
  }, []);

  // Calendar: only render items with due time today
  const todaysEvents = useMemo(() => {
    if (!events?.length) return [];
    const today = new Date().toISOString().slice(0, 10);
    return events.filter((e) => String(e.date || "").startsWith(today));
  }, [events]);

  // At-Risk clients (sample until you save risk per client)
  const atRisk = useMemo(() => {
    const high = clients.filter((c) => c.risk === "High").slice(0, 1);
    const med = clients.filter((c) => c.risk === "Medium").slice(0, 1);
    if (!clients.length) {
      return [
        { name: "John Doe", risk: "High", msg: "No contact in 6mo" },
        { name: "Acme Corp", risk: "Medium", msg: "Renewal overdue" },
      ];
    }
    return [
      ...high.map((c) => ({ name: c.name, risk: "High", msg: c.riskNote || "Follow up" })),
      ...med.map((c) => ({ name: c.name, risk: "Medium", msg: c.riskNote || "Review soon" })),
    ];
  }, [clients]);

  return (
    <div className="px-8 py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#172A3A]">
            Dashboard
          </h1>
          <div className="text-gray-500">Welcome back to <span className="font-semibold">Pro IRP</span>!</div>
        </div>
        {/* user pill can stay top-right in your layout via Header/Profile component */}
      </div>

      {/* Top tiles row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={TILE_BASE}>
          <div className={TILE_TITLE}>Total Clients</div>
          <div className={TILE_VALUE}>{totalClients}</div>
        </div>

        <div className={TILE_BASE}>
          <div className={TILE_TITLE}>Retention Rate</div>
          <div className={TILE_VALUE}>{retentionRate.label}</div>
          {retentionRate.sample && (
            <div className="text-xs text-gray-400">Sample data</div>
          )}
        </div>

        <div className={TILE_BASE}>
          <div className={TILE_TITLE}>Churned Clients (30d)</div>
          <div className={TILE_VALUE}>{churn30}</div>
          {!clients.length && (
            <div className="text-xs text-gray-400">Sample data</div>
          )}
        </div>

        <div className={TILE_BASE}>
          <div className={TILE_TITLE}>Tasks Due</div>
          <div className={TILE_VALUE}>{tasksDue}</div>
        </div>
      </div>

      {/* Charts + Calendar row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
        {/* Retention Trend (Line) */}
        <div className="xl:col-span-1">
          <div className={CARD_BASE}>
            <SectionHeader
              title="Retention Trend (Demo)"
              note={!clients.length ? "Sample data" : undefined}
            />
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={retentionSeries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <XAxis dataKey="m" tick={{ fontSize: 12 }} />
                  <YAxis domain={[80, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke="#1E3A8A"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Churn Breakdown (Pie) */}
        <div className="xl:col-span-1">
          <div className={CARD_BASE}>
            <SectionHeader
              title="Churn Breakdown (Demo)"
              note={!clients.length ? "Sample data" : undefined}
            />
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={churnPie}
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    nameKey="name"
                  >
                    {churnPie.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {churnPie.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-gray-600">
                  <span
                    className="inline-block w-3 h-3 rounded"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  {s.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Today's Calendar */}
        <div className="xl:col-span-1">
          <div className={CARD_BASE}>
            <SectionHeader title="Today's Calendar" />
            <div className="h-[240px] overflow-y-auto border rounded-lg p-3 bg-gray-50">
              {todaysEvents.length === 0 ? (
                <div className="text-gray-500 text-sm">
                  No events with due times yet.
                </div>
              ) : (
                <ul className="text-sm">
                  {todaysEvents.map((e, idx) => (
                    <li key={idx} className="mb-2">
                      <div className="font-medium text-[#172A3A]">{e.title || "Event"}</div>
                      <div className="text-gray-500">
                        {new Date(e.date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tasks + At-Risk row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <div className={CARD_BASE}>
            <SectionHeader title="Tasks" />
            <div className="divide-y">
              {tasks?.length ? (
                tasks.slice(0, 6).map((t) => (
                  <div key={t.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[#172A3A]">{t.title || t.name || "Task"}</div>
                      <div className="text-gray-500 text-sm">
                        {t.description || t.desc || ""}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {t.due ? new Date(t.due).toLocaleString() : ""}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-gray-500">No tasks yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-1">
          <div className={CARD_BASE}>
            <SectionHeader title="At-Risk Clients" />
            <div className="space-y-4">
              {atRisk.map((r, i) => (
                <div key={i}>
                  <div className="font-semibold text-[#172A3A]">{r.name}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        r.risk === "High"
                          ? "bg-red-100 text-red-700"
                          : r.risk === "Low"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {r.risk} Risk
                    </span>
                    <span className="text-gray-500 text-sm">{r.msg}</span>
                  </div>
                </div>
              ))}
              {!clients.length && (
                <div className="text-xs text-gray-400">
                  Will populate from /risk when scores are saved on clients.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

