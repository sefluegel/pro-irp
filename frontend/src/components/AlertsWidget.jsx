import React from "react";
const alerts = [
  { message: "3 policies expiring in 10 days!", type: "warning" },
  { message: "2 clients with upcoming birthdays", type: "info" },
];

const alertColors = {
  warning: "bg-yellow-100 text-yellow-800",
  info: "bg-blue-100 text-blue-800",
};

const AlertsWidget = () => (
  <div className="bg-white rounded-2xl shadow p-6 border-t-4" style={{ borderTopColor: "#007cf0" }}>
    <div className="text-lg font-semibold text-[#172A3A] mb-4">Alerts</div>
    <ul className="space-y-2">
      {alerts.map((a, i) => (
        <li key={i} className={`px-3 py-2 rounded ${alertColors[a.type]}`}>
          {a.message}
        </li>
      ))}
    </ul>
  </div>
);

export default AlertsWidget;
