import React from "react";

const brand = {
  navy: "#172A3A",
  slate: "#20344A",
  gold: "#FFB800",
  gradFrom: "#1f3550",
  gradTo: "#1672d6",
  border: "1px solid rgba(0,0,0,0.06)",
};

const C = ({ children, className = "" }) => (
  <div className={`max-w-7xl w-full mx-auto px-4 ${className}`}>{children}</div>
);

export default function AgentsPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${brand.gradFrom} 0%, ${brand.gradTo} 100%)`,
        fontFamily: "Inter, system-ui, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      {/* Top nav bar */}
      <header className="py-4">
        <C>
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="Pro IRP" className="w-9 h-9 rounded-full bg-white shadow" />
              <span className="font-extrabold text-white text-lg">
                Pro <span style={{ color: brand.gold }}>IRP</span>
              </span>
            </a>
            <nav className="hidden md:flex items-center gap-6">
              <a href="/agents" className="text-white/90 hover:underline">Agents</a>
              <a href="/agencies" className="text-white/90 hover:underline">Agencies</a>
              <a href="/fmo" className="text-white/90 hover:underline">FMO</a>
              <a href="/pricing" className="text-white/90 hover:underline">Pricing</a>
              <a
                href="/login"
                className="px-4 py-2 rounded-xl font-bold"
                style={{ background: brand.navy, color: brand.gold }}
              >
                Login
              </a>
            </nav>
            <a
              href="/login"
              className="md:hidden px-4 py-2 rounded-xl font-bold"
              style={{ background: brand.navy, color: brand.gold }}
            >
              Login
            </a>
          </div>
        </C>
      </header>

      {/* Hero */}
      <section className="pt-4 pb-6 sm:pt-8 sm:pb-8">
        <C>
          <div
            className="bg-white rounded-3xl shadow-2xl p-8 md:p-10"
            style={{ borderTop: `8px solid ${brand.gold}`, border: brand.border }}
          >
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
                     style={{ background: "rgba(23,42,58,.08)", color: brand.navy }}>
                  ⚡ AI-Powered Agent Platform
                </div>
                <h1 className="text-4xl sm:text-5xl font-extrabold mt-3 leading-tight" style={{ color: brand.navy }}>
                  Win Renewals with <span style={{ color: brand.gold }}>Targeted AI</span>
                </h1>
                <p className="mt-4 text-lg" style={{ color: brand.slate }}>
                  Pro IRP predicts who’s likely to churn, explains <em>why</em>, and launches the right
                  automation at the right time, so you protect your book with less busywork.
                </p>

                {/* Stat bar */}
                <div className="mt-5 grid sm:grid-cols-3 gap-3">
                  <Stat k="20%" v="Avg. annual churn" />
                  <Stat k="½+" v="Churn reduced with Pro IRP" />
                  <Stat k="92.3%" v="Sample retention trend" />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="/pricing"
                    className="px-5 py-3 rounded-xl font-bold shadow"
                    style={{ background: brand.gold, color: brand.navy }}
                  >
                    Start — $29.99/mo
                  </a>
                  <a
                    href="/login"
                    className="px-5 py-3 rounded-xl font-bold shadow"
                    style={{ background: brand.navy, color: brand.gold }}
                  >
                    Try the Demo
                  </a>
                </div>
                <p className="mt-2 text-sm" style={{ color: brand.slate }}>
                  Agents from $29.99/mo • Cancel anytime
                </p>
              </div>

              {/* Hero visual */}
              <div className="relative">
                <div className="rounded-2xl overflow-hidden shadow-2xl border bg-white"
                     style={{ border: brand.border }}>
                  <img
                    src="/img/screens/client-risk.png"
                    alt="Client profile with risk score"
                    className="w-full h-auto"
                    style={{ aspectRatio: "16/9", objectFit: "cover" }}
                  />
                </div>
                <div className="absolute -right-6 -bottom-6 w-[45%] hidden md:block">
                  <div className="rounded-2xl overflow-hidden shadow-2xl border bg-white"
                       style={{ border: brand.border }}>
                    <img
                      src="/img/screens/automations.png"
                      alt="Automations & tasks"
                      className="w-full h-auto"
                      style={{ aspectRatio: "16/10", objectFit: "cover" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </C>
      </section>

      {/* AI Value row */}
      <section className="py-8">
        <C>
          <div className="grid md:grid-cols-3 gap-5">
            <AIBlock
              title="Predictive Churn Scoring"
              desc="Get a clear risk score for every client plus human-readable drivers (new tier-4 med, no recent contact, network change)."
            />
            <AIBlock
              title="Targeted Automation"
              desc="Kick off the right touch automatically—texts, emails, review reminders—based on each client’s risk pattern."
            />
            <AIBlock
              title="Agent-First Workflow"
              desc="A focused daily task list ties actions to retention outcomes. Do what moves the needle—skip the noise."
            />
          </div>
        </C>
      </section>

      {/* Feature Sections */}
      <Feature
        id="aep"
        badge="AEP Wizard"
        title="Prepare for AEP in minutes—not weeks"
        copy="Smart filters surface who needs annual reviews, plan change checks, or risk-based follow ups. Bulk sequences help you reach everyone fast."
        img="/img/screens/aep-wizard.png"
        flip={false}
      />
      <Feature
        id="profile"
        badge="Client Profile"
        title="Know the ‘why’ behind each risk score"
        copy="See the red flags, recent communications, and the next best action. One page to prioritize and act."
        img="/img/screens/client-risk.png"
        flip={true}
      />
      <Feature
        id="oep"
        badge="OEP Retention Hub"
        title="Stay protected through OEP"
        copy="Track movements and outreach during OEP. Keep your renewals secure when switching risk is highest."
        img="/img/screens/oep-hub.png"
        flip={false}
      />

      {/* Social proof / quote */}
      <section className="py-8">
        <C>
          <div
            className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 text-center"
            style={{ borderTop: `8px solid ${brand.gold}`, border: brand.border }}
          >
            <p className="text-xl md:text-2xl font-semibold" style={{ color: brand.navy }}>
              “Pro IRP focuses my day. I know exactly who’s at risk and what to do next.”
            </p>
            <p className="mt-2 text-sm" style={{ color: brand.slate }}>
              — Early Access Agent
            </p>
          </div>
        </C>
      </section>

      {/* FAQ */}
      <section className="py-6">
        <C className="grid md:grid-cols-2 gap-5">
          <FAQ q="How does the AI pick who to contact?" a="We weigh multiple signals—medication changes, lapse in contact, network changes, and engagement. Each client gets a score with human-readable reasons, so your outreach is targeted and transparent." />
          <FAQ q="Do I have to change my process?" a="No. Start by using the prioritized task list and prebuilt templates. Add automations as you get comfortable—everything is modular." />
          <FAQ q="Will this help outside AEP/OEP?" a="Yes. Birthdays, policy reviews, and life events trigger year-round outreach to keep relationships warm and churn low." />
          <FAQ q="What does it cost?" a="Agents start at $29.99/month. Agencies start at $49.99/agent/month (pricing varies by size). See the pricing page for details." />
        </C>
      </section>

      {/* Final CTA */}
      <section className="py-10">
        <C>
          <div
            className="bg-white rounded-3xl shadow-2xl p-8 text-center"
            style={{ borderTop: `8px solid ${brand.gold}`, border: brand.border }}
          >
            <h3 className="text-2xl font-extrabold" style={{ color: brand.navy }}>
              Cut churn in half—protect your renewals
            </h3>
            <p className="mt-2" style={{ color: brand.slate }}>
              Get started in minutes. No long contracts.
            </p>
            <div className="mt-4 flex gap-3 justify-center flex-wrap">
              <a
                href="/pricing"
                className="px-5 py-3 rounded-xl font-bold shadow"
                style={{ background: brand.gold, color: brand.navy }}
              >
                Start — $29.99/mo
              </a>
              <a
                href="/login"
                className="px-5 py-3 rounded-xl font-bold shadow"
                style={{ background: brand.navy, color: brand.gold }}
              >
                Try the Demo
              </a>
            </div>
          </div>
        </C>
      </section>

      {/* Footer */}
      <footer className="py-8">
        <C className="flex items-center justify-between text-sm text-white/85">
          <div>© {new Date().getFullYear()} Pro IRP</div>
          <div className="flex items-center gap-6">
            <a href="/pricing" className="hover:underline">Pricing</a>
            <a href="mailto:fluegel.scott@proirp.com" className="hover:underline">
              fluegel.scott@proirp.com
            </a>
          </div>
        </C>
      </footer>
    </div>
  );
}

/* --- Small helpers/components --- */

function Stat({ k, v }) {
  return (
    <div
      className="rounded-2xl px-4 py-3 shadow-md bg-white"
      style={{ border: brand.border }}
    >
      <div className="text-2xl font-extrabold" style={{ color: brand.navy }}>{k}</div>
      <div className="text-xs" style={{ color: brand.slate }}>{v}</div>
    </div>
  );
}

function AIBlock({ title, desc }) {
  return (
    <div
      className="bg-white rounded-3xl shadow-2xl p-6"
      style={{ borderTop: `8px solid ${brand.gold}`, border: brand.border }}
    >
      <h3 className="text-xl font-extrabold" style={{ color: brand.navy }}>{title}</h3>
      <p className="mt-2" style={{ color: brand.slate }}>{desc}</p>
    </div>
  );
}

function Feature({ id, badge, title, copy, img, flip }) {
  return (
    <section id={id} className="py-6">
      <C>
        <div
          className={`bg-white rounded-3xl shadow-2xl p-8 md:p-10 grid lg:grid-cols-2 gap-10 items-center ${flip ? "lg:flex-row-reverse" : ""}`}
          style={{ borderTop: `8px solid ${brand.gold}`, border: brand.border }}
        >
          <div className={`${flip ? "order-2" : "order-1"}`}>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: "rgba(23,42,58,.08)", color: brand.navy }}
            >
              {badge}
            </div>
            <h2 className="text-3xl font-extrabold mt-3" style={{ color: brand.navy }}>
              {title}
            </h2>
            <p className="mt-3 text-lg" style={{ color: brand.slate }}>
              {copy}
            </p>
            <ul className="mt-4 text-sm space-y-2" style={{ color: brand.slate }}>
              {id === "aep" && (
                <>
                  <li>• Bulk review lists & sequences</li>
                  <li>• Smart filters for plan change risk</li>
                  <li>• Templates for fast, personal outreach</li>
                </>
              )}
              {id === "profile" && (
                <>
                  <li>• Explainable risk drivers</li>
                  <li>• Recent comms & next best action</li>
                  <li>• One-click call, text, email</li>
                </>
              )}
              {id === "oep" && (
                <>
                  <li>• Movement tracking during OEP</li>
                  <li>• At-risk lists and progress</li>
                  <li>• Retention KPIs at a glance</li>
                </>
              )}
            </ul>
          </div>
          <div className={`${flip ? "order-1" : "order-2"}`}>
            <div className="rounded-2xl overflow-hidden shadow-2xl border bg-white"
                 style={{ border: brand.border }}>
              <img
                src={img}
                alt={badge}
                className="w-full h-auto"
                style={{ aspectRatio: "16/9", objectFit: "cover" }}
              />
            </div>
          </div>
        </div>
      </C>
    </section>
  );
}

function FAQ({ q, a }) {
  return (
    <div
      className="bg-white rounded-2xl shadow-xl p-6"
      style={{ borderLeft: `6px solid ${brand.gold}`, borderRight: brand.border, borderTop: brand.border, borderBottom: brand.border }}
    >
      <div className="font-bold" style={{ color: brand.navy }}>{q}</div>
      <div className="mt-2 text-sm" style={{ color: brand.slate }}>{a}</div>
    </div>
  );
}
