import React, { useMemo, useState } from "react";

// Agencies Landing Page for Pro IRP
// - TailwindCSS for styling
// - Self-contained pricing calculator that uses the requested tiers
// - Copy-ready content oriented to agency owners

export default function AgenciesPage() {
  const BASE = 29.99;
  const [agents, setAgents] = useState(10);

  // Heavier discount schedule (monthly, USD per agent)
  // Matches your requested tiers; single-count breakpoints kept (41, 45)
  // NOTE: For counts between special points (e.g., 42–44), we apply the next better rate (<=45).
  const getPricePerAgent = (n) => {
    if (n <= 1) return 29.99;
    if (n === 2) return 28.49;
    if (n === 3) return 27.99;
    if (n === 4) return 27.49;
    if (n === 5) return 26.99;
    if (n === 6) return 26.49;
    if (n === 7) return 25.99;
    if (n === 8) return 25.49;
    if (n === 9) return 24.99;
    if (n === 10) return 24.49;
    if (n <= 15) return 23.49; // 11–15
    if (n <= 20) return 22.99; // 16–20
    if (n <= 25) return 22.49; // 21–25
    if (n <= 30) return 21.99; // 26–30
    if (n <= 35) return 21.49; // 31–35
    if (n <= 40) return 20.99; // 36–40
    if (n === 41) return 20.79; // 41 (special)
    if (n <= 45) return 20.49; // 42–45 (inherits 45's rate)
    if (n <= 50) return 19.99; // 46–50
    if (n <= 75) return 19.49; // 51–75
    if (n <= 100) return 18.99; // 76–100
    return 18.99; // Default top tier; can swap to "Contact sales" if preferred
  };

  const pricePer = useMemo(() => getPricePerAgent(agents), [agents]);
  const monthly = useMemo(() => +(pricePer * agents).toFixed(2), [pricePer, agents]);
  const savingsPerAgent = useMemo(() => +(BASE - pricePer).toFixed(2), [pricePer]);
  const savingsMonthly = useMemo(() => +(savingsPerAgent * agents).toFixed(2), [savingsPerAgent, agents]);

  const copyQuote = async () => {
    const text = `Pro IRP Agency Quote\nAgents: ${agents}\nPer-Agent: $${pricePer.toFixed(2)}/mo\nMonthly Total: $${monthly.toFixed(2)}\nSavings vs Individual: $${savingsMonthly.toFixed(2)}/mo`;
    try {
      await navigator.clipboard.writeText(text);
      alert("Quote copied to clipboard.");
    } catch (e) {
      console.error(e);
      alert("Couldn't copy automatically — please copy manually.");
    }
  };

  const tiers = [
    { label: "1 (Individual)", range: "1", unit: 29.99 },
    { label: "2", range: "2", unit: 28.49 },
    { label: "3", range: "3", unit: 27.99 },
    { label: "4", range: "4", unit: 27.49 },
    { label: "5", range: "5", unit: 26.99 },
    { label: "6", range: "6", unit: 26.49 },
    { label: "7", range: "7", unit: 25.99 },
    { label: "8", range: "8", unit: 25.49 },
    { label: "9", range: "9", unit: 24.99 },
    { label: "10", range: "10", unit: 24.49 },
    { label: "11–15", range: "11–15", unit: 23.49 },
    { label: "16–20", range: "16–20", unit: 22.99 },
    { label: "21–25", range: "21–25", unit: 22.49 },
    { label: "26–30", range: "26–30", unit: 21.99 },
    { label: "31–35", range: "31–35", unit: 21.49 },
    { label: "36–40", range: "36–40", unit: 20.99 },
    { label: "41", range: "41", unit: 20.79 },
    { label: "45", range: "45", unit: 20.49 },
    { label: "46–50", range: "46–50", unit: 19.99 },
    { label: "51–75", range: "51–75", unit: 19.49 },
    { label: "76–100", range: "76–100", unit: 18.99 },
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0b1630] via-[#0b1e45] to-[#050a18] text-white">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-10">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
              Pro IRP for Agencies
            </h1>
            <p className="mt-4 text-lg text-white/80">
              Cut churn across your entire book with AI-driven retention workflows, risk scoring, and OEP/AEP tools designed for scale.
            </p>
            <ul className="mt-6 space-y-3 text-white/80">
              <li>• Reduce annual client loss (often ~20%) with proactive outreach</li>
              <li>• Agency-wide dashboards, permissions, and roll‑up reporting</li>
              <li>• AEP Wizard, OEP Retention Hub, targeted automation</li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#pricing" className="rounded-2xl bg-white text-slate-900 px-5 py-3 font-semibold shadow">
                View Pricing & Calculator
              </a>
              <a href="#demo" className="rounded-2xl border border-white/30 px-5 py-3 font-semibold hover:bg-white/10">
                Book a Demo
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-blue-500/20 to-cyan-400/20 blur-2xl" />
            <div className="relative rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <h3 className="text-xl font-semibold">Agency Outcomes at a Glance</h3>
              <div className="mt-5 grid grid-cols-2 gap-4">
                {[
                  { k: "Avg. retention lift", v: "10–20%" },
                  { k: "Time saved per agent", v: "3–5 hrs/mo" },
                  { k: "Automation coverage", v: "AEP + OEP" },
                  { k: "Setup", v: "Days, not weeks" },
                ].map((m) => (
                  <div key={m.k} className="rounded-xl bg-white/5 p-4 border border-white/10">
                    <div className="text-sm text-white/60">{m.k}</div>
                    <div className="text-2xl font-semibold">{m.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <h2 className="text-2xl md:text-3xl font-semibold">Built for Agency Owners</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Risk Scoring & Profiles",
              desc: "Surface high‑risk members automatically. Prioritize follow‑ups and keep revenue on the books.",
            },
            {
              title: "OEP Retention Hub",
              desc: "Centralize churn prevention with targeted automations and task queues during OEP.",
            },
            {
              title: "AEP Wizard",
              desc: "Plan, segment, and execute outreach at scale—without spreadsheet chaos.",
            },
            {
              title: "Agency Controls",
              desc: "Team permissions, roll‑ups, and performance dashboards across books and locations.",
            },
            {
              title: "Bulk Automation",
              desc: "Trigger emails/SMS and tasks from risk thresholds, events, and workflows.",
            },
            {
              title: "Analytics & Reporting",
              desc: "Measure churn, outreach, and retention lift. Turn insights into predictable growth.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-lg font-semibold">{f.title}</div>
              <p className="mt-2 text-white/75 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing & Calculator */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-5">
          {/* Calculator */}
          <div className="md:col-span-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-2xl font-semibold">Agency Pricing Calculator</h3>
              <p className="mt-2 text-white/70 text-sm">Enter your team size to see your rate. Discounts deepen as you grow.</p>

              <div className="mt-6 space-y-5">
                <div>
                  <label htmlFor="agents" className="text-sm text-white/80">Number of agents</label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      id="agents"
                      type="number"
                      min={1}
                      max={100}
                      value={agents}
                      onChange={(e) => setAgents(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                      className="w-28 rounded-xl border border-white/20 bg-white/10 px-3 py-2 outline-none"
                    />
                    <input
                      type="range"
                      min={1}
                      max={100}
                      value={agents}
                      onChange={(e) => setAgents(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-16 text-right text-sm text-white/70">1–100</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                    <div className="text-xs text-white/60">Per‑Agent</div>
                    <div className="mt-1 text-2xl font-semibold">${pricePer.toFixed(2)}<span className="text-sm text-white/60">/mo</span></div>
                    <div className="mt-1 text-xs text-white/60">vs. $29.99 individual</div>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                    <div className="text-xs text-white/60">Monthly Total</div>
                    <div className="mt-1 text-2xl font-semibold">${monthly.toFixed(2)}</div>
                    <div className="mt-1 text-xs text-emerald-300">Save ${savingsMonthly.toFixed(2)}/mo</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button onClick={copyQuote} className="rounded-2xl bg-white text-slate-900 px-5 py-2.5 font-semibold shadow">Copy Quote</button>
                  <a href="#demo" className="rounded-2xl border border-white/30 px-5 py-2.5 font-semibold hover:bg-white/10">Request Custom Quote</a>
                </div>

                <p className="text-[11px] text-white/50">* Between special breakpoints (e.g., after 41), the calculator applies the better adjacent rate to keep discounts monotonic.</p>
              </div>
            </div>
          </div>

          {/* Tier Table */}
          <div className="md:col-span-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 h-full">
              <h4 className="text-lg font-semibold">Tiered Rates</h4>
              <div className="mt-4 max-h-[480px] overflow-auto rounded-2xl border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/10">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Agents</th>
                      <th className="px-4 py-2 text-right font-semibold">Per‑Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.map((t) => (
                      <tr key={t.label} className="odd:bg-white/5">
                        <td className="px-4 py-2">{t.label}</td>
                        <td className="px-4 py-2 text-right">${t.unit.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-white/60">Individual plan is $29.99/mo. Agency pricing auto‑applies based on total active agents.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo CTA */}
      <section id="demo" className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-tr from-white/10 to-white/5 p-8 text-center">
          <h3 className="text-2xl md:text-3xl font-semibold">Ready to cut churn across your agency?</h3>
          <p className="mt-2 text-white/75">See how Pro IRP lifts retention and scales your outreach in AEP and OEP.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a className="rounded-2xl bg-white text-slate-900 px-6 py-3 font-semibold shadow" href="#">Book a 20‑min demo</a>
            <a className="rounded-2xl border border-white/30 px-6 py-3 font-semibold hover:bg-white/10" href="#">Talk to sales</a>
          </div>
        </div>
      </section>
    </div>
  );
}
