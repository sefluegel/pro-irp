import React from "react";

/**
 * HomeSimple — ultra-clean hero with laptop + phone mockups
 * Layout: top nav → hero (headline + CTAs + devices) → tiny footer
 * Assets expected:
 *  - /logo.png
 *  - /img/hero-laptop.png  (dashboard screenshot)
 *  - /img/hero-phone.png   (client profile screenshot)
 */

const brand = {
  navy: "#172A3A",
  slate: "#20344A",
  gold: "#FFB800",
  gradFrom: "#1f3550",
  gradTo: "#1672d6",
  card: "rgba(255,255,255,0.98)",
  border: "1px solid rgba(0,0,0,0.06)",
};

const C = ({ children, className = "" }) => (
  <div className={`max-w-7xl w-full mx-auto px-4 ${className}`}>{children}</div>
);

export default function HomeSimple() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${brand.gradFrom} 0%, ${brand.gradTo} 100%)`,
        fontFamily: "Inter, system-ui, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      {/* Top nav */}
      <header className="py-4">
        <C>
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Pro IRP"
                className="w-9 h-9 rounded-full bg-white shadow"
              />
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

      {/* HERO */}
      <main className="flex-1 py-10 sm:py-16">
        <C className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Copy block */}
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
              <p className="mt-4 text-lg" style={{ color: brand.slate }}>
                Predict churn. Automate outreach. Protect renewals. Purpose-built for
                Medicare agents, agencies, and FMOs.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="/agents"
                  className="px-5 py-3 rounded-xl font-bold shadow"
                  style={{ background: brand.gold, color: brand.navy }}
                >
                  For Agents
                </a>
                <a
                  href="/agencies"
                  className="px-5 py-3 rounded-xl font-bold shadow"
                  style={{ background: brand.navy, color: brand.gold }}
                >
                  For Agencies & FMOs
                </a>
                <a
                  href="/pricing"
                  className="px-5 py-3 rounded-xl font-bold shadow bg-white"
                  style={{ color: brand.navy, border: brand.border }}
                >
                  See Pricing
                </a>
              </div>

              <p className="mt-3 text-sm" style={{ color: brand.slate }}>
                Agents from $29.99/mo • Agency pricing from $49.99/agent
              </p>
            </div>
          </div>

          {/* Device mockups */}
          <div className="relative">
            {/* Laptop */}
            <div className="relative mx-auto w-[720px] max-w-full">
              {/* Lid (screen frame) */}
              <div
                className="rounded-[14px] overflow-hidden shadow-2xl"
                style={{
                  background: "#0e1620",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="bg-black/90 h-6 flex justify-center items-center">
                  <div className="w-20 h-1.5 rounded-full bg-white/20" />
                </div>
                <div className="bg-[#0b1220]">
                  <img
                    src="/img/hero-laptop.png"
                    alt="Pro IRP Dashboard"
                    className="w-full block"
                    style={{ aspectRatio: "16/10", objectFit: "cover" }}
                  />
                </div>
              </div>
              {/* Base */}
              <div
                className="h-6 mx-auto rounded-b-2xl mt-[-2px]"
                style={{
                  width: "92%",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.65), rgba(230,230,230,0.9))",
                  boxShadow:
                    "0 10px 25px rgba(0,0,0,.25), inset 0 2px 0 rgba(255,255,255,.6)",
                }}
              />
            </div>

            {/* Phone (overlapping) */}
            <div className="absolute -right-4 -bottom-6 w-[220px]">
              <div
                className="rounded-[28px] overflow-hidden shadow-2xl border"
                style={{
                  borderColor: "rgba(0,0,0,0.12)",
                  background: "#0d0f14",
                }}
              >
                {/* Notch */}
                <div className="h-6 bg-black/90 relative">
                  <div className="absolute left-1/2 -translate-x-1/2 top-1.5 h-4 w-24 bg-black rounded-full" />
                </div>
                <img
                  src="/img/hero-phone.png"
                  alt="Pro IRP Client Profile"
                  className="w-full block"
                  style={{ aspectRatio: "9/19.5", objectFit: "cover" }}
                />
                <div className="h-6 bg-black/90" />
              </div>
            </div>
          </div>
        </C>
      </main>

      {/* Minimal footer */}
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
