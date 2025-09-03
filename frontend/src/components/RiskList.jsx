import React from "react";
const risks = [
  { name: "John Doe", risk: "High", reason: "No contact in 6mo" },
  { name: "Acme Corp", risk: "Medium", reason: "Renewal overdue" },
];

const riskColors = {
  High: "bg-red-600",
  Medium: "bg-yellow-500",
  Low: "bg-green-500",
};

const RiskList = () => (
  <div className="bg-white rounded-2xl shadow p-6 border-t-4" style={{ borderTopColor: "#FFB800" }}>
    <div className="text-lg font-semibold text-[#172A3A] mb-4">At-Risk Clients</div>
    <ul className="space-y-4">
      {risks.map((r, i) => (
        <li key={i} className="flex flex-col">
          <span className="font-bold">{r.name}</span>
          <span className={`w-fit px-2 py-1 text-xs rounded text-white font-bold mt-1 ${riskColors[r.risk]}`}>{r.risk} Risk</span>
          <span className="text-xs text-gray-500">{r.reason}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default RiskList;
