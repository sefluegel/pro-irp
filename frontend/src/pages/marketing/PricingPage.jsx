import React from "react";
const brand={navy:"#172A3A", slate:"#20344A", gold:"#FFB800", border:"1px solid rgba(0,0,0,.06)"};
const C=({children,className=""})=><div className={`max-w-6xl w-full mx-auto px-4 ${className}`}>{children}</div>;
const Card=({children,ring})=><div className="bg-white rounded-3xl shadow-2xl p-6"
  style={{borderTop:`8px solid ${brand.gold}`, border:brand.border, boxShadow:ring?"0 0 0 3px rgba(23,42,58,.15)":undefined}}>{children}</div>;

export default function PricingPage(){
  return(
    <div className="min-h-screen bg-gray-50" style={{fontFamily:"Inter, system-ui"}}>
      <C className="py-8">
        <a href="/" className="text-sm text-blue-700">← Back</a>
        <h1 className="text-4xl font-extrabold mt-2" style={{color:brand.navy}}>Pricing</h1>
        <p className="mt-2" style={{color:brand.slate}}>Transparent plans that scale with you.</p>

        <div className="grid md:grid-cols-3 gap-6 mt-6">
          <Card ring>
            <h3 className="text-xl font-extrabold" style={{color:brand.navy}}>Agent</h3>
            <div className="text-3xl font-extrabold mt-1" style={{color:brand.navy}}>$29.99<span className="text-base font-semibold">/mo</span></div>
            <ul className="mt-3 space-y-2" style={{color:brand.slate}}>
              <li>Predictive churn scoring</li><li>Automation & templates</li><li>Email reminders & tasks</li>
            </ul>
            <a href="/login" className="mt-5 inline-block px-5 py-3 rounded-xl font-bold"
               style={{background:brand.gold, color:brand.navy}}>Start Free Trial</a>
          </Card>

          <Card>
            <h3 className="text-xl font-extrabold" style={{color:brand.navy}}>Agency</h3>
            <div className="text-lg mt-1" style={{color:brand.slate}}>Starting at <b>$49.99</b> / agent / month*</div>
            <ul className="mt-3 space-y-2" style={{color:brand.slate}}>
              <li>Team dashboards</li><li>Workflows & approvals</li><li>Role-based access</li>
            </ul>
            <p className="text-xs mt-2" style={{color:brand.slate}}>*Pricing varies by agent count & features.</p>
            <a href="/agencies" className="mt-5 inline-block px-5 py-3 rounded-xl font-bold"
               style={{background:brand.navy, color:brand.gold}}>Estimate & Contact</a>
          </Card>

          <Card>
            <h3 className="text-xl font-extrabold" style={{color:brand.navy}}>FMO & Enterprise</h3>
            <div className="text-3xl font-extrabold mt-1" style={{color:brand.navy}}>Custom</div>
            <ul className="mt-3 space-y-2" style={{color:brand.slate}}>
              <li>White-label & SSO</li><li>Advanced reporting</li><li>Priority support</li>
            </ul>
            <a href="/fmo" className="mt-5 inline-block px-5 py-3 rounded-xl font-bold"
               style={{background:brand.navy, color:brand.gold}}>Contact Us</a>
          </Card>
        </div>
      </C>
    </div>
  );
}
