import React,{useState} from "react";
const brand={navy:"#172A3A", slate:"#20344A", gold:"#FFB800", border:"1px solid rgba(0,0,0,.06)"};
const C=({children,className=""})=><div className={`max-w-6xl w-full mx-auto px-4 ${className}`}>{children}</div>;
const Card=({children})=><div className="bg-white rounded-3xl shadow-2xl p-6" style={{borderTop:`8px solid ${brand.gold}`, border:brand.border}}>{children}</div>;

export default function AgenciesPage(){
  const [agents,setAgents]=useState(10);
  const monthly=(Math.max(1,Number(agents||0))*49.99).toFixed(2);
  return(
    <div className="min-h-screen bg-gray-50" style={{fontFamily:"Inter, system-ui"}}>
      <C className="py-8">
        <a href="/" className="text-sm text-blue-700">← Back</a>
        <h1 className="text-4xl font-extrabold mt-2" style={{color:brand.navy}}>For Agencies</h1>
        <p className="mt-2" style={{color:brand.slate}}>Visibility, workflows, and accountability across your book.</p>

        <div className="grid md:grid-cols-3 gap-5 mt-6">
          <Card><h3 className="text-xl font-bold" style={{color:brand.navy}}>Team dashboards</h3><p style={{color:brand.slate}}>Track protected renewals, retention rate, and activity.</p></Card>
          <Card><h3 className="text-xl font-bold" style={{color:brand.navy}}>Workflows & approvals</h3><p style={{color:brand.slate}}>Standardize outreach and reviews across reps.</p></Card>
          <Card><h3 className="text-xl font-bold" style={{color:brand.navy}}>Role-based access</h3><p style={{color:brand.slate}}>Keep PHI and client data appropriately scoped.</p></Card>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6 mt-8"
             style={{borderTop:`8px solid ${brand.gold}`, border:brand.border}}>
          <h3 className="text-xl font-bold" style={{color:brand.navy}}>Estimate your price</h3>
          <p className="text-sm mt-1" style={{color:brand.slate}}>*Starting at $49.99 per agent per month</p>
          <div className="mt-3 flex items-center gap-3">
            <label className="text-sm" style={{color:brand.slate}}>Agents</label>
            <input type="number" min="1" value={agents}
                   onChange={e=>setAgents(e.target.value)}
                   className="px-4 py-2 rounded-xl border w-32"
                   style={{borderColor:"rgba(0,0,0,.12)", color:brand.navy}}/>
            <div className="text-xl font-extrabold" style={{color:brand.navy}}>
              ≈ ${monthly}/mo
            </div>
          </div>
          <a href="mailto:fluegel.scott@proirp.com?subject=Agency%20pricing"
             className="mt-4 inline-block px-5 py-3 rounded-xl font-bold"
             style={{background:brand.navy, color:brand.gold}}>Talk to Sales</a>
        </div>
      </C>
    </div>
  );
}
