import React from "react";
const activities = [
  { time: "3m ago", desc: "Sent review reminder to Jane Doe" },
  { time: "15m ago", desc: "Policy renewed: Acme Corp" },
  { time: "2h ago", desc: "Client added: Sarah Johnson" },
  { time: "1d ago", desc: "Broadcast sent: Annual Update" },
];

const ActivityFeed = () => (
  <div className="bg-white rounded-2xl shadow p-6 border-t-4" style={{ borderTopColor: "#FFB800" }}>
    <div className="text-lg font-semibold text-[#172A3A] mb-4">Recent Activity</div>
    <ul className="divide-y">
      {activities.map((a, i) => (
        <li key={i} className="py-3 flex justify-between text-sm">
          <span>{a.desc}</span>
          <span className="text-gray-400">{a.time}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default ActivityFeed;
