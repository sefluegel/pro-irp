import React from "react";
const brand={navy:"#172A3A", slate:"#20344A", gold:"#FFB800", border:"1px solid rgba(0,0,0,.06)"};
const C=({children,className=""})=><div className={`max-w-6xl w-full mx-auto px-4 ${className}`}>{children}</div>;
const Card=({children})=><div className="bg-white rounded-3xl shadow-2xl p-6" style={{borderTop:`8px solid ${brand.gold}`, border:brand.border}}>{children}</div>;

export default function FmoPage(){
  return(
    <div className="min-h-screen bg-gray-50" style={{fontFamily:"Inter, system-ui"}}>
      <C className="py-8">
        <a href="/" className="text-sm text-blue-700">← Back</a>
        <h1 className="text-4xl font-extrabold mt-2" style={{color:brand.navy}}>FMO & Enterprise</h1>
        <p className="mt-2" style={{color:brand.slate}}>White-label options, SSO, advanced reporting, and priority support.</p>

        <div className="grid md:grid-cols-3 gap-5 mt-6">
          <Card><h3 className="text-xl font-bold" style={{color:brand.navy}}>Roll-up reporting</h3><p style={{color:brand.slate}}>Visibility across agencies and agents.</p></Card>
          <Card><h3 className="text-xl font-bold" style={{color:brand.navy}}>Security & SSO</h3><p style={{color:brand.slate}}>Single sign-on and audit trails.</p></Card>
          <Card><h3 className="text-xl font-bold" style={{color:brand.navy}}>White-label</h3><p style={{color:brand.slate}}>Your brand, your domain, our engine.</p></Card>
        </div>

        <div className="text-center mt-8">
          <a href="mailto:fluegel.scott@proirp.com?subject=FMO%20Enterprise"
             className="px-6 py-3 rounded-xl font-bold"
             style={{background:brand.navy, color:brand.gold}}>Contact Us</a>
        </div>
      </C>
    </div>
  );
}
