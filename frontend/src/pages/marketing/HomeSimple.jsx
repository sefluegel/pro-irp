import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Pro IRP — Marketing Home (with slideshow)
 * --------------------------------------------------
 * Sections:
 *  - Top Nav (minimal)
 *  - Hero (headline + CTAs)
 *  - Product Showcase (slideshow with 5 screenshots)
 *  - Quick Value Props (3 cards)
 *  - Final CTA
 *  - Footer
 *
 * Image setup:
 *   Place 3–5 PNG/JPG screenshots in:
 *     /frontend/public/img/screens/
 *   Example filenames (you can change them below):
 *     - 01-dashboard.png
 *     - 02-client-profile.png
 *     - 03-tasks.png
 *     - 04-oep.png
 *     - 05-automations.png
 *
 * If you use different names, just update the `shots` array below.
 */

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

export default function HomeSimple() {
  // ---------- Slideshow config ----------
  const shots = useMemo(
    () => [
      "/img/screens/01-dashboard.png",
      "/img/screens/02-client-profile.png",
      "/img/screens/03-tasks.png",
      "/img/screens/04-oep.png",
      "/img/screens/05-automations.png",
    ],
    []
  );

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  const go = (dir = 1) => setIndex((i) => (i + dir + shots.length) % shots.length);
  const goTo = (i) => setIndex(((i % shots.length) + shots.length) % shots.length);

  useEffect(() => {
    if (!playing) return;
    timerRef.current = setInterval(() => go(1), 4000);
    return () => clearInterval(timerRef.current);
  }, [playing, shots.length]);

  // ---------- UI ----------
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${brand.gradFrom} 0%, ${brand.gradTo} 100%)`,
        fontFamily: "Inter, system-ui, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      {/* NAV */}
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

      {/* HERO */}
      <section className="pt-6 pb-2 sm:pt-10 sm:pb-6">
        <C>
          <div
            className="bg-white rounded-3xl shadow-2xl p-8 md:p-10"
            style={{ borderTop: `8px solid ${brand.gold}`, border: brand.border }}
          >
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              {/* Copy */}
              <div>
                <h1
                  className="text-4xl sm:text-5xl font-extrabold tracking-tight"
                  style={{ color: brand.navy }}
                >
                  Next Generation Insurance <span style={{ color: brand.gold }}>Retention</span>
                </h1>
                <p className="mt-4 text-lg" style={{ color: brand.slate }}>
                  Predict churn. Automate outreach. Protect renewals. Built for Medicare
                  agents, agencies, and FMOs.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
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

              {/* Showcase (compact slideshow card) */}
              <div>
                <Showcase
                  shots={shots}
                  index={index}
                  onPrev={() => go(-1)}
                  onNext={() => go(1)}
                  onDot={goTo}
                  onPause={() => setPlaying(false)}
                  onPlay={() => setPlaying(true)}
                  playing={playing}
                  onTouchStart={(x) => { touchStartX.current = x; touchDeltaX.current = 0; setPlaying(false); }}
                  onTouchMove={(dx) => { touchDeltaX.current = dx; }}
                  onTouchEnd={() => {
                    const dx = touchDeltaX.current;
                    if (Math.abs(dx) > 40) go(dx > 0 ? -1 : 1);
                    setPlaying(true);
                  }}
                />
              </div>
            </div>
          </div>
        </C>
      </section>

      {/* VALUE PROPS */}
      <section className="py-8 sm:py-10">
        <C className="grid md:grid-cols-3 gap-5">
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
        </C>
      </section>

      {/* FINAL CTA */}
      <section className="py-10">
        <C>
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
        </C>
      </section>

      {/* FOOTER */}
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

/* ============== Showcase (Slideshow) ============== */

function Showcase({
  shots,
  index,
  onPrev,
  onNext,
  onDot,
  onPause,
  onPlay,
  playing,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) {
  return (
    <div
      className="group relative select-none"
      onMouseEnter={onPause}
      onMouseLeave={onPlay}
      onTouchStart={(e) => onTouchStart?.(e.touches[0].clientX)}
      onTouchMove={(e) => onTouchMove?.(e.touches[0].clientX - (e.target?.dataset?.startX ?? 0))}
      onTouchEnd={onTouchEnd}
    >
      {/* Frame */}
      <div
        className="rounded-2xl overflow-hidden shadow-2xl border bg-white"
        style={{ border: brand.border }}
      >
        <div className="relative" style={{ aspectRatio: "16/9" }}>
          {/* Slides */}
          {shots.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={`Product screenshot ${i + 1}`}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{ opacity: i === index ? 1 : 0 }}
              loading={i === 0 ? "eager" : "lazy"}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <button
        aria-label="Previous"
        onClick={onPrev}
        className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 rounded-full w-10 h-10 items-center justify-center shadow-lg bg-white/90 border hover:bg-white transition"
        style={{ border: brand.border, color: brand.navy }}
      >
        ‹
      </button>
      <button
        aria-label="Next"
        onClick={onNext}
        className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 rounded-full w-10 h-10 items-center justify-center shadow-lg bg-white/90 border hover:bg-white transition"
        style={{ border: brand.border, color: brand.navy }}
      >
        ›
      </button>

      {/* Dots + Play/Pause */}
      <div className="flex items-center gap-2 justify-center mt-3">
        <button
          onClick={playing ? onPause : onPlay}
          className="px-2 py-1 text-xs rounded-md bg-white/90 border shadow"
          style={{ border: brand.border, color: brand.navy }}
          aria-label={playing ? "Pause slideshow" : "Play slideshow"}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <div className="flex items-center gap-2">
          {shots.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => onDot(i)}
              className="w-2.5 h-2.5 rounded-full transition"
              style={{
                background: i === index ? brand.gold : "rgba(255,255,255,.9)",
                outline: i === index ? `2px solid ${brand.navy}` : "none",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
