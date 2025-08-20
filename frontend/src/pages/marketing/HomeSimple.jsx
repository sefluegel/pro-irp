import React from "react";

const brand = { navy:"#172A3A", slate:"#20344A", gold:"#FFB800",
  gradFrom:"#1f3550", gradTo:"#1672d6", card:"rgba(255,255,255,.98)", border:"1px solid rgba(0,0,0,.06)"
};
const C = ({children, className=""}) => (
  <div className={`max-w-6xl w-full mx-auto px-4 ${className}`}>{children}</div>
);

export default function HomeSimple() {
  return (
    <div className="min-h-screen flex flex-col"
      style={{background:`linear-gradient(135deg, ${brand.gradFrom} 0%, ${brand.gradTo} 100%)`,
      fontFamily:"Inter, system-ui, Segoe UI, Roboto, Arial, sans-serif"}}>
      {/* Top bar */}
      <header className="py-4">
        <C>
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="Pro IRP" className="w-9 h-9 rounded-full bg-white shadow"/>
              <span className="font-extrabold text-white">Pro <span style={{color:brand.gold}}>IRP</span></span>
            </a>
            <nav className="flex items-center gap-5">
              <a href="/agents" className="text-white/90 hover:underline">Agents</a>
              <a href="/agencies" className="text-white/90 hover:underline">Agencies</a>
              <a href="/fmo" className="text-white/90 hover:underline">FMO</a>
              <a href="/pricing" className="text-white/90 hover:underline">Pricing</a>
              <a href="/login" className="px-4 py-2 rounded-xl font-bold"
                 style={{background:brand.navy, color:brand.gold}}>Login</a>
            </nav>
          </div>
        </C>
      </header>

      {/* Simple hero */}
      <main className="flex-1 py-16">
        <C>
          <div className="bg-white rounded-3xl shadow-2xl p-10 text-center mx-auto max-w-2xl"
               style={{borderTop:`8px solid ${brand.gold}`, border:brand.border}}>
            <h1 className="text-4xl font-extrabold" style={{color:brand.navy}}>
              Next Generation Insurance <span style={{color:brand.gold}}>Retention</span>
            </h1>
            <p className="mt-3 text-lg" style={{color:brand.slate}}>
              AI-powered retention for Medicare teams. Predict churn, automate outreach, protect renewals.
            </p>
            <div className="mt-7 flex gap-3 justify-center flex-wrap">
              <a href="/agents" className="px-5 py-3 rounded-xl font-bold shadow"
                 style={{background:brand.gold, color:brand.navy}}>For Agents</a>
              <a href="/agencies" className="px-5 py-3 rounded-xl font-bold shadow"
                 style={{background:brand.navy, color:brand.gold}}>For Agencies & FMOs</a>
              <a href="/pricing" className="px-5 py-3 rounded-xl font-bold shadow bg-white"
                 style={{color:brand.navy, border:brand.border}}>See Pricing</a>
            </div>
          </div>
        </C>
      </main>

      <footer className="py-8">
        <C className="flex items-center justify-between text-sm text-white/80">
          <div>© {new Date().getFullYear()} Pro IRP</div>
          <a className="hover:underline" href="mailto:fluegel.scott@proirp.com">fluegel.scott@proirp.com</a>
        </C>
      </footer>
    </div>
  );
}
