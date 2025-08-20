// src/pages/ProIRPLanding.jsx
import React from "react";

const bg = {
  minHeight: "100vh",
  background:
    "linear-gradient(135deg,#0b1f3a 0%, #0a2244 45%, #0d2b57 100%)",
  color: "#fff",
  fontFamily: "system-ui, Segoe UI, Roboto, Arial, sans-serif",
};

const container = { maxWidth: 1120, margin: "0 auto", padding: "0 20px" };
const card = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 16,
};
const pill = {
  border: "1px solid rgba(255,255,255,.25)",
  borderRadius: 12,
  padding: "10px 14px",
  color: "#fff",
  textDecoration: "none",
  display: "inline-block",
};
const primary = {
  background: "#3b82f6",
  borderRadius: 14,
  padding: "12px 16px",
  color: "#fff",
  fontWeight: 700,
  textDecoration: "none",
  display: "inline-block",
};

export default function ProIRPLanding() {
  return (
    <div style={bg}>
      {/* NAV */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, backdropFilter: "blur(6px)", borderBottom: "1px solid rgba(255,255,255,.12)" }}>
        <div style={{ ...container, height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 12, color: "#fff", textDecoration: "none" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,.12)", display: "grid", placeItems: "center" }}>🛡️</div>
            <strong>Pro IRP</strong>
          </a>
          <nav style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <a href="#features" style={{ color: "rgba(255,255,255,.85)", textDecoration: "none" }}>Features</a>
            <a href="#how" style={{ color: "rgba(255,255,255,.85)", textDecoration: "none" }}>How it works</a>
            <a href="#pricing" style={{ color: "rgba(255,255,255,.85)", textDecoration: "none" }}>Pricing</a>
            <a href="#faq" style={{ color: "rgba(255,255,255,.85)", textDecoration: "none" }}>FAQ</a>
            <a href="/login" style={pill}>Login</a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section style={{ padding: "64px 0 28px" }}>
        <div style={container}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 28, alignItems: "center" }}>
            <div>
              <h1 style={{ fontSize: 48, lineHeight: 1.1, margin: 0, fontWeight: 900 }}>
                AI-Powered Predictive Medicare <span style={{ color: "#94c6ff" }}>Retention</span>
              </h1>
              <p style={{ opacity: .88, margin: "14px 0 22px", maxWidth: 640 }}>
                Pro IRP (Insurance Retention Partner) helps Medicare agents, agencies, and FMOs reduce churn,
                protect renewals, and strengthen client relationships with predictive analytics, real-time signals,
                and intelligent automation.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                <a href="#signup" style={primary}>Start Free Trial</a>
                <a href="#pricing" style={pill}>See pricing</a>
                <a href="/login" style={pill}>Login</a>
              </div>

              {/* Netlify Form */}
              <form
                id="signup"
                name="early-access"
                method="POST"
                data-netlify="true"
                action="/thanks"
                style={{ display: "flex", gap: 10, maxWidth: 560 }}
              >
                <input type="hidden" name="form-name" value="early-access" />
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue="fluegel.scott@proirp.com"
                  placeholder="you@agency.com"
                  style={{
                    flex: 1, padding: 12, borderRadius: 10,
                    border: "1px solid rgba(255,255,255,.25)",
                    background: "rgba(255,255,255,.1)", color: "#fff",
                    outline: "none"
                  }}
                />
                <button type="submit" style={{ ...primary, borderRadius: 10 }}>Notify me</button>
              </form>
              <p style={{ opacity: .7, marginTop: 8, fontSize: 12 }}>
                No spam. Unsubscribe anytime. Questions?{" "}
                <a href="mailto:fluegel.scott@proirp.com" style={{ color: "#a5d8ff" }}>fluegel.scott@proirp.com</a>
              </p>
            </div>

            {/* Value card */}
            <div style={{ ...card, padding: 20 }}>
              <h3 style={{ marginTop: 0 }}>Predict, prevent, retain</h3>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, opacity: .9 }}>
                <li><strong>Predictive churn scoring</strong> with explainable drivers</li>
                <li><strong>Real-time Rx & milestone alerts</strong> so you act in time</li>
                <li><strong>Agent-first automation</strong> for birthdays, reviews, plan changes</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: "48px 0" }}>
        <div style={container}>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[
              { t: "Predictive analytics", d: "Churn risk scores with clear drivers so teams know what to do next." },
              { t: "Real-time signals", d: "Rx events and milestones trigger tasks, outreach, and workflows." },
              { t: "Agent-first automation", d: "One-click tasks, templates, and reminders that fit your day." },
            ].map((f, i) => (
              <div key={i} style={{ ...card, padding: 18 }}>
                <h4 style={{ marginTop: 0 }}>{f.t}</h4>
                <p style={{ margin: 0, opacity: .85 }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: "12px 0" }}>
        <div style={container}>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[
              { n: 1, t: "Connect", d: "Import clients or connect your CRM. Set simple retention goals." },
              { n: 2, t: "Predict", d: "See risk scores and reasons. Prioritize the right members." },
              { n: 3, t: "Retain", d: "Automate outreach and track renewals protected." },
            ].map((s) => (
              <div key={s.n} style={{ ...card, padding: 18 }}>
                <h4 style={{ marginTop: 0 }}>{s.n}. {s.t}</h4>
                <p style={{ margin: 0, opacity: .85 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: "48px 0" }}>
        <div style={container}>
          <h2 style={{ textAlign: "center", margin: 0, fontSize: 28, fontWeight: 800 }}>Pricing</h2>
          <p style={{ textAlign: "center", opacity: .75, marginTop: 8 }}>Simple, transparent plans that grow with you.</p>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(3, 1fr)", marginTop: 24 }}>
            {[
              { name: "Agent", price: "$29.99/mo", features: ["Predictive churn scoring", "Automation & templates", "Email reminders & tasks"], cta: "Start Free Trial" },
              { name: "Agency", price: "$299/mo", features: ["Team dashboards", "Workflows & approvals", "Role-based access"], cta: "Start Free Trial" },
              { name: "FMO & Enterprise", price: "Custom", features: ["White-label & SSO", "Advanced reporting", "Priority support"], cta: "Talk to sales", highlight: true },
            ].map((p, i) => (
              <div key={i} style={{ ...card, padding: 18, boxShadow: p.highlight ? "0 0 0 2px rgba(59,130,246,.35)" : "none" }}>
                <h4 style={{ marginTop: 0 }}>{p.name}</h4>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{p.price}</div>
                <ul style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.6, opacity: .9 }}>
                  {p.features.map((x, idx) => <li key={idx}>{x}</li>)}
                </ul>
                {p.cta === "Talk to sales" ? (
                  <a href="mailto:fluegel.scott@proirp.com" style={{ ...pill, display: "block", textAlign: "center", marginTop: 12 }}>{p.cta}</a>
                ) : (
                  <a href="#signup" style={{ ...primary, display: "block", textAlign: "center", marginTop: 12, borderRadius: 12 }}>{p.cta}</a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: "48px 0" }}>
        <div style={{ ...container, maxWidth: 820 }}>
          <h2 style={{ textAlign: "center", margin: 0, fontSize: 28, fontWeight: 800 }}>Frequently asked questions</h2>
          <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
            <div style={{ ...card, padding: 16 }}>
              <strong>Is there a free trial?</strong>
              <p style={{ margin: 6, opacity: .85 }}>Yes. You can try Pro IRP free—no credit card required—then pick a plan when you’re ready.</p>
            </div>
            <div style={{ ...card, padding: 16 }}>
              <strong>Can I use Pro IRP for my whole team?</strong>
              <p style={{ margin: 6, opacity: .85 }}>Yes. Agency and FMO plans include team features, roles, and dashboards.</p>
            </div>
            <div style={{ ...card, padding: 16 }}>
              <strong>Does Pro IRP integrate with my tools?</strong>
              <p style={{ margin: 6, opacity: .85 }}>CSV import/export today. APIs & CRM integrations are on the roadmap.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: "48px 0" }}>
        <div style={{ ...container, maxWidth: 860 }}>
          <div style={{ ...card, padding: 24, textAlign: "center" }}>
            <h3 style={{ marginTop: 0, fontSize: 24, fontWeight: 800 }}>Ready to reduce churn and protect renewals?</h3>
            <p style={{ margin: "6px 0 16px", opacity: .85 }}>Join the early access list and be first to try Pro IRP.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="#signup" style={primary}>Get started</a>
              <a href="/login" style={pill}>Login</a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,.12)", padding: "28px 0" }}>
        <div style={container}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", alignItems: "center" }}>
            <div style={{ opacity: .7, fontSize: 14 }}>© {new Date().getFullYear()} Pro IRP. All rights reserved.</div>
            <div style={{ textAlign: "center", fontSize: 14 }}>
              <a href="mailto:fluegel.scott@proirp.com" style={{ color: "#a5d8ff", textDecoration: "none" }}>fluegel.scott@proirp.com</a>
            </div>
            <div style={{ textAlign: "right", opacity: .7, fontSize: 14 }}>Hebron, Kentucky • Remote first</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
