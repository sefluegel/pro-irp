import React from "react";
const tasks = [
  { title: "Policy Review: Jane Doe", due: "Today", status: "Due" },
  { title: "Birthday: Bob Smith", due: "Tomorrow", status: "Upcoming" },
  { title: "Renewal: Acme Corp", due: "Overdue", status: "Overdue" },
  { title: "Call: John Doe", due: "Next Week", status: "Upcoming" },
];

const statusColors = {
  Overdue: "bg-red-100 text-red-700",
  Due: "bg-yellow-100 text-yellow-700",
  Upcoming: "bg-blue-100 text-blue-700",
};

const TaskList = () => (
  <div className="bg-white rounded-2xl shadow p-6 border-t-4" style={{ borderTopColor: "#007cf0" }}>
    <div className="text-lg font-semibold text-[#172A3A] mb-4">Tasks</div>
    <ul className="divide-y">
      {tasks.map((t, i) => (
        <li key={i} className="flex items-center justify-between py-3">
          <span>{t.title}</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[t.status]}`}>
            {t.status}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

export default TaskList;
