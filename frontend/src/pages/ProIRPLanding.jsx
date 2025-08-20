// src/pages/ProIRPLanding.jsx
import React from "react";

const brand = {
  navy: "#172A3A",
  slate: "#20344A",
  gold: "#FFB800",
  gradFrom: "#376FDB",
  gradTo: "#8FD0FF",
  cardBg: "rgba(255,255,255,0.96)",
  border: "1px solid rgba(0,0,0,0.06)",
};

const container = "max-w-6xl w-full mx-auto px-4";

export default function ProIRPLanding() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${brand.gradFrom} 0%, ${brand.gradTo} 100%)`,
        fontFamily: "Inter, system-ui, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      {/* NAV */}
      <header className="sticky top-0 z-40">
        <div className={`${container}`}>
          <div
            className="flex items-center justify-between rounded-2xl mt-4 px-4 py-3 shadow-2xl"
            style={{ background: brand.cardBg, border: brand.border }}
          >
            <a href="/" className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Pro IRP"
                className="w-10 h-10 rounded-full shadow"
                style={{ objectFit: "contain" }}
              />
              <span className="font-extrabold text-lg" style={{ color: brand.navy }}>
                Pro IRP
              </span>
            </a>
            <nav className="hidden md:flex items-center gap-6">
              <a className="hover:underline" href="#features" style={{ color: brand.slate }}>
                Features
              </a>
              <a className="hover:underline" href="#how" style={{ color: brand.slate }}>
                How it works
              </a>
              <a className="hover:underline" href="#pricing" style={{ color: brand.slate }}>
                Pricing
              </a>
              <a className="hover:underline" href="#faq" style={{ color: brand.slate }}>
                FAQ
              </a>
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
        </div>
      </header>

      {/* HERO */}
      <section className="py-10 sm:py-14">
        <div className={`${container} grid md:grid-cols-2 gap-8 items-center`}>
          <div>
            <div
              className="bg-white rounded-3xl shadow-2xl p-8"
              style={{ borderTop: `8px solid ${brand.gold}`, border: brand.border }}
            >
              <h1
                className="text-4xl sm:text-5xl font-extrabold tracking-tight"
                style={{ color: brand.navy }}
              >
                AI-Powered Predictive Medicare{" "}
                <span style={{ color: brand.gold }}>Retention</span>
              </h1>
              <p className="mt-3 text-lg" style={{ color: brand.slate }}>
                Pro IRP (Insurance Retention Partner) helps Medicare agents, agencies, and FMOs
                reduce churn, protect renewals, and strengthen client relationships with
                predictive analytics, real-time signals, and intelligent automation.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#signup"
                  className="px-5 py-3 rounded-xl font-bold shadow"
                  style={{ background: brand.gold, color: brand.navy }}
                >
                  Start Free Trial
                </a>
                <a
                  href="#pricing"
                  className="px-5 py-3 rounded-xl font-bold shadow"
                  style={{ background: brand.navy, color: brand.gold }}
                >
                  See Pricing
                </a>
                <a
                  href="/login"
                  className="px-5 py-3 rounded-xl font-bold shadow"
                  style={{ background: "#ffffff", color: brand.navy, border: brand.border }}
                >
                  Login
                </a>
              </div>

              {/* Netlify email capture */}
              <form
                id="signup"
                name="early-access"
                method="POST"
                data-netlify="true"
                action="/thanks"
                className="mt-6 flex gap-2 max-w-xl"
              >
                <input type="hidden" name="form-name" value="early-access" />
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue="fluegel.scott@proirp.com"
                  placeholder="you@agency.com"
                  className="flex-1 px-4 py-3 rounded-xl"
                  style={{
                    background: "rgba(0,0,0,0.03)",
                    border: brand.border,
                    color: brand.navy,
                  }}
                />
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl font-bold"
                  style={{ background: brand.navy, color: brand.gold }}
                >
                  Notify me
                </button>
              </form>
              <p className="mt-2 text-sm" style={{ color: brand.slate }}>
                No spam. Unsubscribe anytime. Questions?{" "}
                <a
                  href="mailto:fluegel.scott@proirp.com"
                  className="underline"
                  style={{ color: brand.navy }}
                >
                  fluegel.scott@proirp.com
                </a>
              </p>
            </div>
          </div>

          {/* Right-side welcome card mirroring your login style */}
          <div
            className="bg-white rounded-3xl shadow-2xl p-8"
            style={{ borderTop: `8px solid ${brand.gold}`, border: brand.border }}
          >
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/logo.png"
                alt="Pro IRP"
                className="w-14 h-14 rounded-full shadow bg-white"
                style={{ objectFit: "contain" }}
              />
              <h3 className="text-2xl font-extrabold" style={{ color: brand.navy }}>
                Predict • Prevent • Retain
              </h3>
            </div>
            <ul className="space-y-3">
              <li className="text-base" style={{ color: brand.slate }}>
                <b>Predictive churn scoring</b> with explainable drivers
              </li>
              <li className="text-base" style={{ color: brand.slate }}>
                <b>Real-time Rx & milestone alerts</b> so you act in time
              </li>
              <li className="text-base" style={{ color: brand.slate }}>
                <b>Agent-first automation</b> for birthdays, reviews, plan changes
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-8 sm:py-10">
        <div className={`${container} grid md:grid-cols-3 gap-5`}>
          {[
            {
              t: "Predictive analytics",
              d: "Churn risk scores with clear drivers so teams know what to do next.",
            },
            {
              t: "Real-time signals",
              d: "Rx events and milestones trigger tasks, outreach, and workflows.",
            },
            {
              t: "Agent-first automation",
              d: "One-click tasks, templates, and reminders that fit your day.",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl shadow-2xl p-6"
              style={{ borderTop: `8px solid ${brand.gold}`, border: brand.border }}
            >
              <h4 className="text-xl font-extrabold" style={{ color: brand.navy }}>
                {f.t}
              </h4>
              <p className="mt-2" style={{ color: brand.slate }}>
                {f.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-4">
        <div className={`${container} grid md:grid-cols-3 gap-5`}>
          {[
            { n: 1, t: "Connect", d: "Import clients or connect your CRM. Set retention goals." },
            { n: 2, t: "Predict", d: "See risk scores and reasons. Prioritize the right members." },
            { n: 3, t: "Retain", d: "Automate outreach and track renewals protected." },
          ].map((s) => (
            <div
              key={s.n}
              className="bg-white rounded-3xl shadow-2xl p-6"
              style={{ borderTop: `8px solid ${brand.gold}`, border: brand.border }}
            >
              <h4 className="text-xl font-extrabold" style={{ color: brand.navy }}>
                {s.n}. {s.t}
              </h4>
              <p className="mt-2" style={{ color: brand.slate }}>
                {s.d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-10">
        <div className={`${container}`}>
          <h2 className="text-center text-3xl font-extrabold" style={{ color: brand.navy }}>
            Pricing
          </h2>
          <p className="text-center mt-2" style={{ color: brand.slate }}>
            Simple, transparent plans that grow with you.
          </p>

          <div className="grid md:grid-cols-3 gap-5 mt-6">
            {[
              {
                name: "Agent",
                price: "$29.99/mo",
                features: ["Predictive churn scoring", "Automation & templates", "Email reminders & tasks"],
                cta: "Start Free Trial",
              },
              {
                name: "Agency",
                price: "$299/mo",
                features: ["Team dashboards", "Workflows & approvals", "Role-based access"],
                cta: "Start Free Trial",
              },
              {
                name: "FMO & Enterprise",
                price: "Custom",
                features: ["White-label & SSO", "Advanced reporting", "Priority support"],
                cta: "Talk to sales",
                highlight: true,
              },
            ].map((p, i) => (
              <div
                key={i}
                className="bg-white rounded-3xl shadow-2xl p-6"
                style={{
                  borderTop: `8px solid ${brand.gold}`,
                  border: brand.border,
                  boxShadow: p.highlight ? "0 0 0 3px rgba(23,42,58,0.15)" : undefined,
                }}
              >
                <h4 className="text-xl font-extrabold" style={{ color: brand.navy }}>
                  {p.name}
                </h4>
                <div className="text-3xl font-extrabold mt-1" style={{ color: brand.navy }}>
                  {p.price}
                </div>
                <ul className="mt-3 space-y-2">
                  {p.features.map((f, idx) => (
                    <li key={idx} style={{ color: brand.slate }}>
                      {f}
                    </li>
                  ))}
                </ul>

                {p.cta === "Talk to sales" ? (
                  <a
                    href="mailto:fluegel.scott@proirp.com"
                    className="mt-4 inline-block px-5 py-3 rounded-xl font-bold"
                    style={{ background: brand.navy, color: brand.gold }}
                  >
                    {p.cta}
                  </a>
                ) : (
                  <a
                    href="#signup"
                    className="mt-4 inline-block px-5 py-3 rounded-xl font-bold"
                    style={{ background: brand.gold, color: brand.navy }}
                  >
                    {p.cta}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-10">
        <div className={`${container} max-w-3xl`}>
          <h2 className="text-center text-3xl font-extrabold" style={{ color: brand.navy }}>
            Frequently asked questions
          </h2>
          <div className="mt-6 grid gap-4">
            <div className="bg-white rounded-3xl shadow-2xl p-6" style={{ border: brand.border }}>
              <b style={{ color: brand.navy }}>Is there a free trial?</b>
              <p className="mt-1" style={{ color: brand.slate }}>
                Yes. You can try Pro IRP free—no credit card required—then pick a plan when you’re ready.
              </p>
            </div>
            <div className="bg-white rounded-3xl shadow-2xl p-6" style={{ border: brand.border }}>
              <b style={{ color: brand.navy }}>Can I use Pro IRP for my whole team?</b>
              <p className="mt-1" style={{ color: brand.slate }}>
                Yes. Agency and FMO plans include team features, roles, and dashboards.
              </p>
            </div>
            <div className="bg-white rounded-3xl shadow-2xl p-6" style={{ border: brand.border }}>
              <b style={{ color: brand.navy }}>Does Pro IRP integrate with my tools?</b>
              <p className="mt-1" style={{ color: brand.slate }}>
                CSV import/export today. APIs & CRM integrations are on the roadmap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-10">
        <div className={`${container}`}>
          <div
            className="bg-white rounded-3xl shadow-2xl p-8 text-center"
            style={{ borderTop: `8px solid ${brand.gold}`, border: brand.border }}
          >
            <h3 className="text-2xl font-extrabold" style={{ color: brand.navy }}>
              Ready to reduce churn and protect renewals?
            </h3>
            <p className="mt-2" style={{ color: brand.slate }}>
              Join the early access list and be first to try Pro IRP.
            </p>
            <div className="mt-4 flex gap-3 justify-center flex-wrap">
              <a
                href="#signup"
                className="px-5 py-3 rounded-xl font-bold shadow"
                style={{ background: brand.gold, color: brand.navy }}
              >
                Get started
              </a>
              <a
                href="/login"
                className="px-5 py-3 rounded-xl font-bold shadow"
                style={{ background: brand.navy, color: brand.gold }}
              >
                Login
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8">
        <div className={`${container} grid md:grid-cols-3 items-center gap-3`}>
          <div className="text-sm" style={{ color: brand.slate }}>
            © {new Date().getFullYear()} Pro IRP. All rights reserved.
          </div>
          <div className="text-center text-sm">
            <a
              href="mailto:fluegel.scott@proirp.com"
              className="underline"
              style={{ color: brand.navy }}
            >
              fluegel.scott@proirp.com
            </a>
          </div>
          <div className="text-sm md:text-right" style={{ color: brand.slate }}>
            Hebron, Kentucky • Remote first
          </div>
        </div>
      </footer>
    </div>
  );
}
