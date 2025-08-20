import React from "react";
const brand={navy:"#172A3A", slate:"#20344A", gold:"#FFB800", border:"1px solid rgba(0,0,0,.06)"};
const Card = ({children}) => (
  <div className="bg-white rounded-3xl shadow-2xl p-6" style={{borderTop:`8px solid ${brand.gold}`, border:brand.border}}>{children}</div>
);
const C=({children,className=""})=><div className={`max-w-6xl w-full mx-auto px-4 ${className}`}>{children}</div>;

export default function AgentsPage(){
  return(
    <div className="min-h-screen bg-gray-50" style={{fontFamily:"Inter, system-ui"}}>
      <C className="py-8">
        <a href="/" className="text-sm text-blue-700">← Back</a>
        <h1 className="text-4xl font-extrabold mt-2" style={{color:brand.navy}}>Built for Agents</h1>
        <p className="mt-2" style={{color:brand.slate}}>Hit your renewals with smart prioritization and automation.</p>

        <div className="grid md:grid-cols-3 gap-5 mt-6">
          <Card><h3 className="text-xl font-bold" style={{color:brand.navy}}>Predictive scoring</h3><p style={{color:brand.slate}}>Know who’s at risk and why—focus your day where it counts.</p></Card>
          <Card><h3 className="text-xl font-bold" style={{color:brand.navy}}>Automation</h3><p style={{color:brand.slate}}>Birthday texts, review reminders, renewal nudges—done.</p></Card>
          <Card><h3 className="text-xl font-bold" style={{color:brand.navy}}>Task hub</h3><p style={{color:brand.slate}}>Clear daily list tied to retention outcomes.</p></Card>
        </div>

        <div className="text-center mt-8">
          <a href="/pricing" className="px-6 py-3 rounded-xl font-bold"
             style={{background:brand.gold, color:brand.navy}}>Start — $29.99/mo</a>
        </div>
      </C>
    </div>
  );
}
