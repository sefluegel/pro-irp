// src/pages/Client.jsx  (or ClientProfile.jsx — use your file path)
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";

const Section = ({ title, children, accent = "#e5e7eb" }) => (
  <div className="bg-white rounded-2xl shadow p-6 mb-6 border-t-4" style={{ borderTopColor: accent }}>
    <div className="text-lg font-semibold text-[#172A3A] mb-3">{title}</div>
    {children}
  </div>
);

export default function ClientPage() {
  const { id } = useParams(); // expects /clients/:id route
  const [client, setClient] = useState(null);
  const [comms, setComms] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load client, comms, tasks
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // client
        const list = await api.listClients();
        const found = (Array.isArray(list) ? list : []).find((c) => String(c.id) === String(id));
        // If you have a dedicated GET /clients/:id, prefer:
        // const found = await api.getClient(id);

        // comms
        const cs = await api.listComms(id).catch(() => []);

        // tasks (try server-side filter, fallback to client-side)
        let ts = [];
        try {
          const fromApi = await api.listTasks();
          ts = Array.isArray(fromApi)
            ? fromApi.filter((t) => String(t.clientId || t.client_id) === String(id))
            : [];
        } catch { ts = []; }

        if (!cancelled) {
          setClient(found || null);
          setComms(Array.isArray(cs) ? cs : []);
          setTasks(ts);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const tasksOpen = useMemo(() => tasks.filter((t) => t.status !== "done"), [tasks]);

  if (loading) {
    return <div className="p-6 text-gray-500">Loading client…</div>;
  }
  if (!client) {
    return <div className="p-6 text-red-600">Client not found.</div>;
  }

  const initials = (client.name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">{client.name || "Unnamed Client"}</h1>
          <div className="text-gray-500">
            Customer for{" "}
            <span className="font-medium">{
              client.customerFor || "—"
            }</span>{" "}
            • Last contact:{" "}
            <span className="font-medium">{client.lastContact || "—"}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded bg-yellow-100 text-yellow-800">📞 Call</button>
          <button className="px-3 py-2 rounded bg-indigo-100 text-indigo-800">💬 Text</button>
          <button className="px-3 py-2 rounded bg-emerald-100 text-emerald-800">✉️ Email</button>
          <button className="px-3 py-2 rounded bg-purple-100 text-purple-800">🗓️ Schedule Review</button>
        </div>
      </div>

      {/* Risk & Comms / Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Risk Summary (placeholder until risk API is populated) */}
        <div className="md:col-span-2">
          <Section title="Extremely High Risk" accent="#ef4444">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 rounded-full border-[10px] border-red-300 grid place-items-center text-2xl text-red-700 font-bold">
                {client.riskScore ?? "—"}
              </div>
              <div className="text-gray-700">
                Client risk score is computed from medications, contact recency, and carrier changes.
                {/* When you have /risk/score for this client, replace with live explanation */}
              </div>
            </div>

            <div className="mt-4">
              <div className="font-semibold text-[#172A3A] mb-1">Red Flags:</div>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                {Array.isArray(client.flags) && client.flags.length
                  ? client.flags.map((f, i) => <li key={i}>{f}</li>)
                  : <li>No red flags recorded.</li>}
              </ul>
            </div>
          </Section>
        </div>

        {/* Recent Communication */}
        <div>
          <Section title="Recent Communication" accent="#60a5fa">
            <ul className="divide-y">
              {comms.length === 0 && <li className="py-2 text-gray-400 text-sm">No communications yet.</li>}
              {comms.slice(0, 5).map((c, i) => (
                <li key={i} className="py-3 text-sm flex justify-between">
                  <span className="text-gray-700">
                    {c.type || "note"}{c.content ? `: ${c.content}` : ""}
                  </span>
                  <span className="text-gray-400">{c.at ? new Date(c.at).toLocaleString() : ""}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Tasks Due" accent="#c084fc">
            <ul className="divide-y">
              {tasksOpen.length === 0 && <li className="py-2 text-gray-400 text-sm">No open tasks.</li>}
              {tasksOpen.slice(0, 5).map((t) => (
                <li key={t.id} className="py-3 text-sm flex justify-between">
                  <span className="text-gray-700">{t.title}</span>
                  <span className="text-gray-400">
                    {t.due ? new Date(t.due).toLocaleString() : "no due date"}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>

      {/* Details */}
      <Section title="Details" accent="#22c55e">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-2">
            <div><span className="font-semibold">Email:</span> {client.email || "—"}</div>
            <div><span className="font-semibold">Phone:</span> {client.phone || "—"}</div>
            <div><span className="font-semibold">Address:</span> {client.address || "—"}</div>
            <div><span className="font-semibold">Effective Date:</span> {client.effectiveDate ? new Date(client.effectiveDate).toLocaleDateString() : "—"}</div>
            <div><span className="font-semibold">Preferred Language:</span> {client.language || "—"}</div>
            <div><span className="font-semibold">Carrier:</span> {client.carrier || "—"}</div>
            <div><span className="font-semibold">Plan:</span> {client.plan || "—"}</div>
            <div><span className="font-semibold">Primary Care:</span> {client.primaryCare || "—"}</div>
          </div>

          <div className="space-y-2">
            <div><span className="font-semibold">SOA:</span> {client.soaOnFile || "—"}</div>
            <div><span className="font-semibold">Permission to Contact:</span> {client.ptcOnFile || "—"}</div>
            <div><span className="font-semibold">Enrollment Form:</span> {client.enrollmentStatus || "—"}</div>
            <div>
              <div className="font-semibold mb-1">Policies:</div>
              <ul className="list-disc pl-6">
                {Array.isArray(client.policies) && client.policies.length
                  ? client.policies.map((p, i) => <li key={i}>{p}</li>)
                  : <li>No policies recorded.</li>}
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-1">Uploaded Files:</div>
              <ul className="list-disc pl-6">
                {Array.isArray(client.files) && client.files.length
                  ? client.files.map((f, i) => <li key={i}>{f.name || f}</li>)
                  : <li>No files uploaded.</li>}
              </ul>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
