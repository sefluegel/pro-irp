import React, { useMemo, useState } from "react";

// Pro IRP — FMO Landing Page
// - TailwindCSS-only, single-file component
// - Oriented to FMOs (multi-agency rollups, pilots, optional add-ons)
// - Includes an ROI calculator tailored for FMOs

export default function FMOPage() {
  // -----------------------------
  // ROI Calculator State
  // -----------------------------
  const [agents, setAgents] = useState(250); // total across downline
  const [clientsPerAgent, setClientsPerAgent] = useState(300);
  const [avgMonthlyRenewal, setAvgMonthlyRenewal] = useState(18); // $ per policy per month
  const [baselineChurn, setBaselineChurn] = useState(20); // % per year
  const [reductionPP, setReductionPP] = useState(10); // percentage-points drop (e.g., 20% -> 10%)
  const [platformMonthlySpend, setPlatformMonthlySpend] = useState(0); // optional: $/mo

  const totalPolicies = useMemo(() => agents * clientsPerAgent, [agents, clientsPerAgent]);
  const baselineChurned = useMemo(() => Math.round(totalPolicies * (baselineChurn / 100)), [totalPolicies, baselineChurn]);
  const preventedChurn = useMemo(() => Math.round(totalPolicies * (reductionPP / 100)), [totalPolicies, reductionPP]);
  const monthlyIncremental = useMemo(() => +(preventedChurn * avgMonthlyRenewal).toFixed(2), [preventedChurn, avgMonthlyRenewal]);
  const annualIncremental = useMemo(() => +(monthlyIncremental * 12).toFixed(2), [monthlyIncremental]);
  const annualPlatformSpend = useMemo(() => +(platformMonthlySpend * 12).toFixed(2), [platformMonthlySpend]);
  const annualNet = useMemo(() => +(annualIncremental - annualPlatformSpend).toFixed(2), [annualIncremental, annualPlatformSpend]);
  const paybackMonths = useMemo(() => (platformMonthlySpend > 0 ? Math.max(0, +(platformMonthlySpend / monthlyIncremental).toFixed(1)) : 0), [platformMonthlySpend, monthlyIncremental]);

  const copyEstimate = async () => {
    const text = [
      `Pro IRP FMO ROI Estimate`,
      `Agents: ${agents}`,
      `Avg clients/agent: ${clientsPerAgent}`,
      `Total policies: ${totalPolicies.toLocaleString()}`,
      `Baseline annual churn: ${baselineChurn}%`,
      `Churn reduction (pp): ${reductionPP}%`,
      `Prevented churn policies/yr: ${preventedChurn.toLocaleString()}`,
      `Avg monthly renewal/policy: $${avgMonthlyRenewal}`,
      `Incremental revenue: $${monthlyIncremental.toLocaleString()} / mo | $${annualIncremental.toLocaleString()} / yr`,
      platformMonthlySpend > 0 ? `Platform spend: $${platformMonthlySpend}/mo | $${annualPlatformSpend}/yr` : ``,
      platformMonthlySpend > 0 ? `Annual net impact: $${annualNet.toLocaleString()}` : ``,
      platformMonthlySpend > 0 && monthlyIncremental > 0 ? `Payback: ~${paybackMonths} months` : ``,
    ].filter(Boolean).join("\n");

    try {
      await navigator.clipboard.writeText(text);
      alert("Estimate copied to clipboard.");
    } catch (e) {
      console.error(e);
      alert("Couldn't copy automatically — please copy manually.");
    }
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0b1630] via-[#0b1e45] to-[#050a18] text-white">
      {/* HERO */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-10">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
              Pro IRP for FMOs
            </h1>
            <p className="mt-4 text-lg text-white/80">
              Lift retention across your entire downline with AI-driven risk scoring, targeted automations, and multi-agency analytics.
            </p>
            <ul className="mt-6 space-y-3 text-white/80">
              <li>• Cut disenrollment during OEP/AEP and stabilize overrides</li>
              <li>• Roll‑up reporting across agencies, locations, and books</li>
              <li>• Pilots you can launch in days — not quarters</li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#roi" className="rounded-2xl bg-white text-slate-900 px-5 py-3 font-semibold shadow">
                Model Your ROI
              </a>
              <a href="#pilot" className="rounded-2xl border border-white/30 px-5 py-3 font-semibold hover:bg-white/10">
                Start a Pilot
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-blue-500/20 to-cyan-400/20 blur-2xl" />
            <div className="relative rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <h3 className="text-xl font-semibold">Downline at a Glance</h3>
              <div className="mt-5 grid grid-cols-2 gap-4">
                {[
                  { k: "Retention lift", v: "10–20%" },
                  { k: "Deploy time", v: "< 2 weeks" },
                  { k: "Automation windows", v: "AEP + OEP" },
                  { k: "Visibility", v: "Agency → Agent" },
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

      {/* WHY FMO */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <h2 className="text-2xl md:text-3xl font-semibold">Why FMOs choose Pro IRP</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Multi‑Agency Rollups",
              desc: "See churn risk and retention KPIs across agencies, regions, and teams with drill‑downs to individual agents.",
            },
            {
              title: "Risk Scoring Engine",
              desc: "Client profiles update in near‑real‑time. Prioritize high‑risk members and trigger workflows at thresholds.",
            },
            {
              title: "OEP Retention Hub",
              desc: "Centralize churn prevention, triage tasks, and coordinate outreach across your downline during OEP.",
            },
            {
              title: "AEP Wizard for Scale",
              desc: "Segment, plan, and execute at FMO scale without spreadsheet sprawl or manual tracking.",
            },
            {
              title: "Automation & Workflows",
              desc: "Emails/SMS, tasks, and playbooks auto‑fire on events (new meds, SEP triggers) and risk thresholds.",
            },
            {
              title: "Analytics & Benchmarks",
              desc: "Compare agencies with cohort benchmarks. Identify outliers and amplify best practices quickly.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-lg font-semibold">{f.title}</div>
              <p className="mt-2 text-white/75 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* OPTIONAL ADD‑ONS */}
      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-xl font-semibold">Optional Add‑Ons</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[ 
              { title: "834 Ingestion & Plan‑Switch Detection", desc: "Activate when your FMO provides 834 files; enrich risk and detect switching patterns across carriers." },
              { title: "Real‑Time Rx Monitoring", desc: "Integrate with data providers to update risk scores as new prescriptions appear (consent + compliance required)." },
              { title: "Mobile App (Roadmap)", desc: "Fully synced iOS/Android app with parity to desktop; single login and real‑time mirroring." },
            ].map((a) => (
              <div key={a.title} className="rounded-2xl bg-white/5 p-4 border border-white/10">
                <div className="font-semibold">{a.title}</div>
                <p className="mt-1 text-white/70 text-sm">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI CALCULATOR */}
      <section id="roi" className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-2xl font-semibold">FMO ROI Calculator</h3>
            <p className="mt-2 text-white/70 text-sm">Estimate impact by modeling prevented churn across your downline.</p>

            <div className="mt-6 grid gap-4">
              <div>
                <label className="text-sm text-white/80">Total agents across your downline</label>
                <div className="mt-2 flex items-center gap-3">
                  <input type="number" min={1} max={100000} value={agents} onChange={(e)=>setAgents(Math.max(1, Number(e.target.value)||1))} className="w-36 rounded-xl border border-white/20 bg-white/10 px-3 py-2 outline-none" />
                  <input type="range" min={1} max={5000} value={Math.min(agents,5000)} onChange={(e)=>setAgents(Number(e.target.value))} className="flex-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/80">Avg clients per agent</label>
                  <input type="number" min={1} max={2000} value={clientsPerAgent} onChange={(e)=>setClientsPerAgent(Math.max(1, Number(e.target.value)||1))} className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 outline-none" />
                </div>
                <div>
                  <label className="text-sm text-white/80">Avg monthly renewal / policy ($)</label>
                  <input type="number" min={1} max={200} value={avgMonthlyRenewal} onChange={(e)=>setAvgMonthlyRenewal(Math.max(1, Number(e.target.value)||1))} className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/80">Baseline annual churn (%)</label>
                  <input type="number" min={1} max={60} value={baselineChurn} onChange={(e)=>setBaselineChurn(Math.max(1, Math.min(60, Number(e.target.value)||1)))} className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 outline-none" />
                </div>
                <div>
                  <label className="text-sm text-white/80">Churn reduction (percentage points)</label>
                  <input type="number" min={1} max={baselineChurn} value={reductionPP} onChange={(e)=>setReductionPP(Math.max(1, Math.min(baselineChurn, Number(e.target.value)||1)))} className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-sm text-white/80">Platform spend ($/mo, optional)</label>
                <input type="number" min={0} max={1000000} value={platformMonthlySpend} onChange={(e)=>setPlatformMonthlySpend(Math.max(0, Number(e.target.value)||0))} className="mt-2 w-56 rounded-xl border border-white/20 bg-white/10 px-3 py-2 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                  <div className="text-xs text-white/60">Prevented churn policies / year</div>
                  <div className="mt-1 text-2xl font-semibold">{preventedChurn.toLocaleString()}</div>
                  <div className="mt-1 text-[11px] text-white/50">Baseline churned: {baselineChurned.toLocaleString()}/yr</div>
                </div>
                <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                  <div className="text-xs text-white/60">Incremental revenue</div>
                  <div className="mt-1 text-2xl font-semibold">${monthlyIncremental.toLocaleString()}<span className="text-sm text-white/60">/mo</span></div>
                  <div className="mt-1 text-sm">${annualIncremental.toLocaleString()} / yr</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                  <div className="text-xs text-white/60">Annual platform spend</div>
                  <div className="mt-1 text-2xl font-semibold">${annualPlatformSpend.toLocaleString()}</div>
                </div>
                <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                  <div className="text-xs text-white/60">Annual net impact</div>
                  <div className="mt-1 text-2xl font-semibold">${annualNet.toLocaleString()}</div>
                  {platformMonthlySpend > 0 && monthlyIncremental > 0 && (
                    <div className="mt-1 text-[11px] text-emerald-300">~{paybackMonths}‑month payback</div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button onClick={copyEstimate} className="rounded-2xl bg-white text-slate-900 px-5 py-2.5 font-semibold shadow">Copy Estimate</button>
                <a href="#pilot" className="rounded-2xl border border-white/30 px-5 py-2.5 font-semibold hover:bg-white/10">Discuss Assumptions</a>
              </div>

              <p className="text-[11px] text-white/50 mt-2">* Calculator is illustrative. Actual results depend on data quality, adoption, and outreach effectiveness.</p>
            </div>
          </div>

          {/* Enterprise Pricing Card */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-2xl font-semibold">Enterprise Pricing</h3>
            <p className="mt-2 text-white/70 text-sm">Custom pricing for FMOs based on total agents, integrations, and support level.</p>

            <ul className="mt-4 space-y-2 text-white/80 text-sm">
              <li>• Volume pricing across agencies and locations</li>
              <li>• Optional 834 ingestion & plan‑switch detection</li>
              <li>• Optional real‑time Rx monitoring integration</li>
              <li>• Dedicated success & rollout playbook</li>
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#pilot" className="rounded-2xl bg-white text-slate-900 px-5 py-3 font-semibold shadow">Request Enterprise Quote</a>
              <a href="#security" className="rounded-2xl border border-white/30 px-5 py-3 font-semibold hover:bg-white/10">View Security</a>
            </div>
          </div>
        </div>
      </section>

      {/* SECURITY & COMPLIANCE */}
      <section id="security" className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-xl font-semibold">Security & Compliance</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              { k: "Data protection", v: "Encryption in transit & at rest" },
              { k: "Access controls", v: "Role‑based, least‑privilege" },
              { k: "PHI workflows", v: "HIPAA‑friendly processes" },
            ].map((m) => (
              <div key={m.k} className="rounded-2xl bg-white/5 p-4 border border-white/10">
                <div className="text-sm text-white/60">{m.k}</div>
                <div className="text-lg font-semibold">{m.v}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-white/60">We work within your compliance framework and can sign BAAs where appropriate.</p>
        </div>
      </section>

      {/* PILOT CTA */}
      <section id="pilot" className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-tr from-white/10 to-white/5 p-8 text-center">
          <h3 className="text-2xl md:text-3xl font-semibold">Launch a Retention Pilot</h3>
          <p className="mt-2 text-white/75">Select 1–3 agencies, define KPIs, and run a 60–90 day pilot with clear success criteria.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a className="rounded-2xl bg-white text-slate-900 px-6 py-3 font-semibold shadow" href="#">Book an executive briefing</a>
            <a className="rounded-2xl border border-white/30 px-6 py-3 font-semibold hover:bg-white/10" href="#">Download one‑pager</a>
          </div>
        </div>
      </section>
    </div>
  );
}
