import React, { useState } from "react";

/**
 * Pro IRP — Landing Page (clean + ordered)
 * Branding pulled from your app:
 * - Gradient: navy → blue
 * - White rounded cards with gold top-bar
 * - Inter font
 * Assets expected in:
 *   /public/logo.png
 *   /public/img/login-shot.png
 *   /public/img/dashboard-shot.png
 */

const brand = {
  gradFrom: "#1f3550",
  gradTo: "#1672d6",
  navy: "#172A3A",
  slate: "#20344A",
  gold: "#FFB800",
  cardBG: "rgba(255,255,255,0.98)",
  border: "1px solid rgba(0,0,0,0.06)",
};

const Container = ({ children, className = "" }) => (
  <div className={`max-w-6xl w-full mx-auto px-4 ${className}`}>{children}</div>
);

export default function ProIRPLanding() {
  const [agents, setAgents] = useState(5);
  const agencyEstimate = Math.max(1, Number(agents || 0)) * 49.99;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${brand.gradFrom} 0%, ${brand.gradTo} 100%)`,
        fontFamily: "Inter, system-ui, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      {/* NAV */}
      <header className="sticky top-0 z-40 backdrop-blur-sm">
        <Container>
          <div
            className="flex items-center justify-between rounded-2xl mt-4 px-4 py-3 shadow-2xl"
            style={{ background: brand.cardBG, border: brand.border }}
          >
            <a href="/" className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Pro IRP"
                className="w-9 h-9 rounded-full shadow bg-white"
              />
              <span className="font-extrabold" style={{ color: brand.navy }}>
                Pro <span style={{ color: brand.gold }}>IRP</span>
              </span>
            </a>

            <nav className="hidden md:flex items-center gap-6">
              <a className="hover:underline" href="#features" style={{ color: brand.slate }}>
                Features
              </a>
              <a className="hover:underline" href="#screens" style={{ color: brand.slate }}>
                Screens
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
        </Container>
      </header>

      {/* HERO */}
      <section className="py-12 sm:py-16" id="hero">
        <Container className="grid md:grid-cols-2 gap-8 items-center">
          {/* Copy */}
          <div>
            <div
              className="bg-white rounded-3xl shadow-2xl p-8"
              style={{ borderTop: `8px solid ${brand.gold}`, border: brand.border }}
            >
              <h1
                className="text-4xl sm:text-5xl font-extrabold tracking-tight"
                style={{ color: brand.navy }}
              >
                Next Generation Insurance <span style={{ color: brand.gold }}>Retention</span>
              </h1>
              <p className="mt-3 text-lg" style={{ color: brand.slate }}>
                AI-powered retention for Medicare agents, agencies, and FMOs. Predict churn, automate
                outreach, and protect renewals in a workflow your team will actually use.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#pricing"
                  className="px-5 py-3 rounded-xl font-bold shadow"
                  style={{ background: brand.gold, color: brand.navy }}
                >
                  Start Free Trial — $29.99/mo
                </a>
                <a
                  href="/login"
                  className="px-5 py-3 rounded-xl font-bold shadow"
                  style={{ background: brand.navy, color: brand.gold }}
                >
                  Log In
                </a>
              </div>
            </div>
          </div>

          {/* Screenshot card */}
          <div
            id="screens"
            className="bg-white rounded-3xl shadow-2xl p-6"
            style={{ borderTop: `8px solid ${brand.gold}`, border: brand.border }}
          >
            <div className="grid gap-4">
              <img
                src="/img/login-shot.png"
                alt="Pro IRP Login"
                className="rounded-2xl border"
                style={{ borderColor: "rgba(0,0,0,0.06)" }}
              />
              <img
                src="/img/dashboard-shot.png"
                alt="Pro IRP Dashboard"
                className="rounded-2xl border"
                style={{ borderColor: "rgba(0,0,0,0.06)" }}
              />
            </div>
            <p className="mt-3 text-sm text-center" style={{ color: brand.slate }}>
              Real product screenshots for clarity and trust.
            </p>
          </div>
        </Container>
      </section>

      {/* FEATURES — keep it tight: 3 focused cards */}
      <section className="py-8 sm:py-10" id="features">
        <Container className="grid md:grid-cols-3 gap-5">
          {[
            {
              t: "Predictive churn scoring",
              d: "Spot at-risk members early with explainable drivers so reps know what to do next.",
            },
            {
              t: "Agent-first automation",
              d: "Birthday & review workflows, renewal reminders, and timely outreach in one task list.",
            },
            {
              t: "Team visibility",
              d: "Dashboards for agencies & FMOs; track protected renewals and retention trends.",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl shadow-2xl p-6"
              style={{ borderTop: `8px solid ${brand.gold}`, border: brand.border }}
            >
              <h3 className="text-xl font-extrabold" style={{ color: brand.navy }}>
                {f.t}
              </h3>
              <p className="mt-2" style={{ color: brand.slate }}>
                {f.d}
              </p>
            </div>
          ))}
        </Container>
      </section>

      {/* PRICING */}
      <section className="py-12" id="pricing">
        <Container>
          <h2 className="text-center text-3xl font-extrabold" style={{ color: brand.navy }}>
            Simple, transparent pricing
          </h2>
          <p className="text-center mt-2" style={{ color: brand.slate }}>
            Start small, scale as your team grows.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {/* Agent */}
            <Card title="Agent" topBorder color={brand} cta={{
              label: "Start Free Trial",
              href: "/login",
              variant: "gold",
            }}>
              <Price bold="$29.99" suffix="/mo" color={brand.navy} />
              <Bullets items={[
                "Predictive churn scoring",
                "Automation & templates",
                "Email reminders & tasks",
              ]} color={brand.slate} />
            </Card>

            {/* Agency (with calculator) */}
            <Card title="Agency (estimator)" topBorder color={brand} cta={{
              label: "Talk to Sales",
              href: "mailto:fluegel.scott@proirp.com?subject=Pro%20IRP%20Agency%20Pricing",
              variant: "navy",
            }}>
              <div className="text-lg" style={{ color: brand.slate }}>
                Starting at <b>$49.99</b> / agent / month*
              </div>

              <label className="mt-3 text-sm" style={{ color: brand.slate }}>
                Number of agents
              </label>
              <input
                type="number"
                min="1"
                value={agents}
                onChange={(e) => setAgents(e.target.value)}
                className="mt-1 px-4 py-2 rounded-xl border w-40"
                style={{ borderColor: "rgba(0,0,0,0.12)", color: brand.navy }}
              />

              <div className="mt-3 text-2xl font-extrabold" style={{ color: brand.navy }}>
                Est. ${agencyEstimate.toFixed(2)} / month
              </div>
              <p className="text-xs mt-1" style={{ color: brand.slate }}>
                *Pricing varies by agency size & features. Volume discounts available.
              </p>
              <Bullets className="mt-3" items={[
                "Team dashboards",
                "Workflows & approvals",
                "Role-based access",
              ]} color={brand.slate} />
            </Card>

            {/* FMO & Enterprise */}
            <Card title="FMO & Enterprise" topBorder color={brand} ring cta={{
              label: "Contact Us",
              href: "mailto:fluegel.scott@proirp.com?subject=Pro%20IRP%20FMO%20Enterprise",
              variant: "navy",
            }}>
              <Price bold="Custom" color={brand.navy} />
              <Bullets items={[
                "White-label & SSO",
                "Advanced reporting",
                "Priority support",
              ]} color={brand.slate} />
            </Card>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-10" id="faq">
        <Container className="max-w-3xl">
          {[
            ["Is there a free trial?", "Yes. Try Pro IRP free—no credit card required—then pick a plan when you’re ready."],
            ["Can I use Pro IRP for my whole team?", "Yes. Agency and FMO plans include roles, dashboards, and team visibility."],
            ["Does Pro IRP integrate with my tools?", "CSV import/export today; CRM & API integrations on the roadmap."],
          ].map(([q, a], i) => (
            <div
              key={i}
              className="bg-white rounded-3xl shadow-2xl p-6 mb-4"
              style={{ border: brand.border }}
            >
              <b style={{ color: brand.navy }}>{q}</b>
              <p className="mt-1" style={{ color: brand.slate }}>{a}</p>
            </div>
          ))}
        </Container>
      </section>

      {/* FINAL CTA */}
      <section className="py-10">
        <Container>
          <div
            className="bg-white rounded-3xl shadow-2xl p-8 text-center"
            style={{ borderTop: `8px solid ${brand.gold}`, border: brand.border }}
          >
            <h3 className="text-2xl font-extrabold" style={{ color: brand.navy }}>
              Ready to protect more renewals?
            </h3>
            <p className="mt-2" style={{ color: brand.slate }}>
              Join the early adopters improving retention with Pro IRP.
            </p>
            <div className="mt-4 flex gap-3 justify-center flex-wrap">
              <a
                href="/login"
                className="px-5 py-3 rounded-xl font-bold shadow"
                style={{ background: brand.gold, color: brand.navy }}
              >
                Get Started
              </a>
              <a
                href="mailto:fluegel.scott@proirp.com"
                className="px-5 py-3 rounded-xl font-bold shadow"
                style={{ background: brand.navy, color: brand.gold }}
              >
                Book a Demo
              </a>
            </div>
          </div>
        </Container>
      </section>

      {/* FOOTER */}
      <footer className="py-8">
        <Container className="grid md:grid-cols-3 items-center gap-3">
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
        </Container>
      </footer>
    </div>
  );
}

/* ---------- Small presentational helpers ---------- */

function Card({ title, children, topBorder, ring, color, cta, className = "" }) {
  return (
    <div
      className={`bg-white rounded-3xl shadow-2xl p-6 flex flex-col ${className}`}
      style={{
        borderTop: topBorder ? `8px solid ${color.gold}` : undefined,
        border: color.border,
        boxShadow: ring ? "0 0 0 3px rgba(23,42,58,0.15)" : undefined,
      }}
    >
      <h3 className="text-xl font-extrabold" style={{ color: color.navy }}>
        {title}
      </h3>
      <div className="mt-2">{children}</div>

      {cta && (
        <a
          href={cta.href}
          className="mt-5 inline-block px-5 py-3 rounded-xl font-bold text-center"
          style={{
            background: cta.variant === "navy" ? color.navy : color.gold,
            color: cta.variant === "navy" ? color.gold : color.navy,
          }}
        >
          {cta.label}
        </a>
      )}
    </div>
  );
}

function Price({ bold, suffix = "", color }) {
  return (
    <div className="text-3xl font-extrabold mt-1" style={{ color }}>
      {bold} <span className="text-base font-semibold">{suffix}</span>
    </div>
  );
}

function Bullets({ items, color, className = "" }) {
  return (
    <ul className={`mt-3 space-y-2 ${className}`} style={{ color }}>
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}
