// /frontend/src/components/OutreachLog.jsx
import React from "react";

const OutreachLog = ({ outreach = [] }) => (
  <div className="bg-white rounded-2xl shadow p-6 max-w-2xl mx-auto">
    <h2 className="text-xl font-bold mb-4 text-[#172A3A] flex items-center gap-2">📢 Automated Outreach Log</h2>
    {outreach.length === 0 ? (
      <div className="text-gray-400">No outreach yet.</div>
    ) : (
      <ul className="divide-y">
        {outreach.slice().reverse().map((item, idx) => (
          <li key={idx} className="py-3 flex items-center gap-3 text-lg">
            <span>{item.desc}</span>
            <span className="ml-auto text-sm text-gray-400">{new Date(item.date).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default OutreachLog;
