import React, { useState } from "react";
const clients = [
  "Jane Doe",
  "John Doe",
  "Sarah Johnson",
  "Acme Corp",
];

const QuickLookup = () => {
  const [q, setQ] = useState("");
  const results = clients.filter(name => name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="bg-white rounded-2xl shadow p-6 border-t-4" style={{ borderTopColor: "#007cf0" }}>
      <div className="text-lg font-semibold text-[#172A3A] mb-3">Quick Client Lookup</div>
      <input
        className="w-full p-2 mb-3 border rounded"
        type="text"
        placeholder="Search by name..."
        value={q}
        onChange={e => setQ(e.target.value)}
      />
      <ul className="space-y-1">
        {q && results.length === 0 && (
          <li className="text-sm text-gray-400">No clients found</li>
        )}
        {results.map(name => (
          <li key={name} className="text-sm text-[#20344A]">{name}</li>
        ))}
      </ul>
    </div>
  );
};

export default QuickLookup;
