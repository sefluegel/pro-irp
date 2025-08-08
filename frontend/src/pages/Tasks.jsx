// /frontend/src/pages/Tasks.jsx
import React, { useState } from "react";
import {
  Plus,
  CheckCircle2,
  Trash2,
  Columns2,
  Filter,
  Search,
  User2,
  Phone,
  MessageCircle,
  CalendarClock,
  MoreHorizontal
} from "lucide-react";

const DEMO_TASKS = [
  // Due Today
  {
    id: 1,
    status: "dueToday",
    type: "call",
    title: "Call client for policy review",
    description: "Annual review—remind client about new plan options.",
    contact: "Jane Doe",
    dueDate: "2025-08-07",
    dueTime: "10:00",
    priority: "High",
    assigned: ["Scott Fluegel", "Spencer"],
    complete: false,
  },
  {
    id: 2,
    status: "dueToday",
    type: "sms",
    title: "Send happy birthday SMS",
    description: "",
    contact: "Zain Marketing",
    dueDate: "2025-08-07",
    dueTime: "09:30",
    priority: "Low",
    assigned: ["Scott Fluegel"],
    complete: false,
  },
  // Upcoming
  {
    id: 3,
    status: "upcoming",
    type: "email",
    title: "Complete SOA for Janik",
    description: "",
    contact: "Janik Lilienthal",
    dueDate: "2025-08-08",
    dueTime: "15:00",
    priority: "Medium",
    assigned: ["Cherie Fluegel"],
    complete: false,
  },
  // Overdue
  {
    id: 4,
    status: "overdue",
    type: "call",
    title: "Check-in call: new Rx alert",
    description: "Lisinopril prescribed, tier 4. Discuss with client.",
    contact: "Scott Fluegel",
    dueDate: "2025-08-05",
    dueTime: "16:00",
    priority: "High",
    assigned: ["Spencer"],
    complete: false,
  },
];

const PRIORITY_COLORS = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-green-100 text-green-700",
};

const TYPE_ICONS = {
  call: <Phone size={16} className="text-green-500" />,
  sms: <MessageCircle size={16} className="text-blue-500" />,
  email: <Mail size={16} className="text-pink-600" />,
  calendar: <CalendarClock size={16} className="text-purple-500" />,
};

const SECTION_LABELS = {
  dueToday: "Due Today",
  upcoming: "Upcoming",
  overdue: "Overdue",
};

const Tasks = () => {
  const [tasks, setTasks] = useState(DEMO_TASKS);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showColumns, setShowColumns] = useState(false);

  const columns = [
    { key: "select", label: "" },
    { key: "type", label: "" },
    { key: "title", label: "Task" },
    { key: "contact", label: "Contact" },
    { key: "dueDate", label: "Due" },
    { key: "priority", label: "Priority" },
    { key: "assigned", label: "Assigned" },
    { key: "actions", label: "" },
  ];

  const [visibleCols, setVisibleCols] = useState(columns.map(c => c.key));

  // Utility: filter and sort tasks by section/status
  const filteredTasks = tasks.filter(t =>
    (filter === "all" || t.status === filter) &&
    (search === "" ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.contact.toLowerCase().includes(search.toLowerCase()))
  );

  // Group by section
  const sections = [
    {
      key: "dueToday",
      tasks: filteredTasks.filter(t => t.status === "dueToday"),
    },
    {
      key: "upcoming",
      tasks: filteredTasks.filter(t => t.status === "upcoming"),
    },
    {
      key: "overdue",
      tasks: filteredTasks.filter(t => t.status === "overdue"),
    },
  ];

  // Demo: column toggler
  const handleToggleCol = key => {
    setVisibleCols(cols =>
      cols.includes(key)
        ? cols.filter(c => c !== key)
        : [...cols, key]
    );
  };

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-3xl font-extrabold text-[#172A3A]">Tasks</h1>
        <div className="text-gray-500 mb-3">
          Track, manage, and complete your upcoming activities.
        </div>
        <div className="flex items-center gap-2 mb-4">
          <button
            className={`px-3 py-1 rounded font-semibold text-sm ${
              filter === "all"
                ? "bg-[#FFB800] text-[#172A3A]"
                : "bg-white text-gray-700 border"
            }`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={`px-3 py-1 rounded font-semibold text-sm ${
              filter === "dueToday"
                ? "bg-[#FFB800] text-[#172A3A]"
                : "bg-white text-gray-700 border"
            }`}
            onClick={() => setFilter("dueToday")}
          >
            Due Today
          </button>
          <button
            className={`px-3 py-1 rounded font-semibold text-sm ${
              filter === "upcoming"
                ? "bg-[#FFB800] text-[#172A3A]"
                : "bg-white text-gray-700 border"
            }`}
            onClick={() => setFilter("upcoming")}
          >
            Upcoming
          </button>
          <button
            className={`px-3 py-1 rounded font-semibold text-sm ${
              filter === "overdue"
                ? "bg-[#FFB800] text-[#172A3A]"
                : "bg-white text-gray-700 border"
            }`}
            onClick={() => setFilter("overdue")}
          >
            Overdue
          </button>
          <button
            className={`px-3 py-1 rounded font-semibold text-sm ${
              filter === "completed"
                ? "bg-[#FFB800] text-[#172A3A]"
                : "bg-white text-gray-700 border"
            }`}
            onClick={() => setFilter("completed")}
            disabled
          >
            Completed
          </button>
          <div className="ml-auto flex gap-2">
            <button
              className="flex items-center gap-1 border px-3 py-1 rounded shadow-sm bg-white text-sm"
              onClick={() => setShowColumns(v => !v)}
            >
              <Columns2 size={16} /> Columns
            </button>
            <div className="relative">
              <Search size={16} className="absolute left-2 top-2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-2 py-1 rounded border text-sm w-44"
                placeholder="Search tasks..."
              />
            </div>
            <button className="flex items-center gap-1 border px-3 py-1 rounded shadow-sm bg-white text-sm" disabled>
              <Filter size={16} /> Filters
            </button>
            <button className="bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] px-4 py-2 font-bold rounded-lg shadow-sm flex items-center gap-2">
              <Plus size={18} /> Add Task
            </button>
            <button className="bg-green-100 hover:bg-green-200 text-green-800 px-4 py-2 font-bold rounded-lg shadow-sm flex items-center gap-2">
              <CheckCircle2 size={18} /> Complete
            </button>
            <button className="bg-white hover:bg-gray-100 text-red-600 px-4 py-2 font-bold rounded-lg shadow-sm flex items-center gap-2 border">
              <Trash2 size={18} /> Delete
            </button>
          </div>
        </div>
        {/* Column chooser */}
        {showColumns && (
          <div className="absolute right-10 top-32 bg-white border shadow-lg rounded p-4 z-20">
            <div className="font-bold mb-2">Show Columns</div>
            {columns.map(col => (
              <label key={col.key} className="flex items-center gap-2 mb-1 text-sm">
                <input
                  type="checkbox"
                  checked={visibleCols.includes(col.key)}
                  disabled={["select", "title", "actions"].includes(col.key)}
                  onChange={() => handleToggleCol(col.key)}
                />
                {col.label || col.key}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Tasks Sections */}
      <div>
        {sections.map(
          section =>
            section.tasks.length > 0 && (
              <div key={section.key} className="mb-8">
                <div
                  className={`flex items-center text-lg font-bold mb-1 ${
                    section.key === "dueToday"
                      ? "text-yellow-700"
                      : section.key === "overdue"
                      ? "text-red-600"
                      : "text-gray-700"
                  }`}
                >
                  {section.key === "dueToday" && <span className="mr-1">⭐</span>}
                  {section.key === "overdue" && <span className="mr-1">⏺️</span>}
                  {SECTION_LABELS[section.key]}{" "}
                  <span className="ml-1 text-sm font-normal text-gray-400">
                    {section.tasks.length} task{section.tasks.length !== 1 && "s"}
                  </span>
                </div>
                <div className="overflow-x-auto rounded-2xl shadow bg-white">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {columns
                          .filter(c => visibleCols.includes(c.key))
                          .map(col => (
                            <th key={col.key} className="px-3 py-2 font-bold text-left">
                              {col.label}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.tasks.map(task => (
                        <tr
                          key={task.id}
                          className={
                            section.key === "dueToday"
                              ? "bg-yellow-50 border-b"
                              : section.key === "overdue"
                              ? "bg-red-50 border-b"
                              : "border-b"
                          }
                        >
                          {/* Select */}
                          {visibleCols.includes("select") && (
                            <td className="px-3 py-2">
                              <input type="checkbox" />
                            </td>
                          )}
                          {/* Type/Icon */}
                          {visibleCols.includes("type") && (
                            <td className="px-3 py-2">
                              {TYPE_ICONS[task.type] || <User2 size={16} />}
                            </td>
                          )}
                          {/* Title/description */}
                          {visibleCols.includes("title") && (
                            <td className="px-3 py-2">
                              <div className="font-semibold">{task.title}</div>
                              {task.description && (
                                <div className="text-xs text-gray-500">
                                  {task.description}
                                </div>
                              )}
                            </td>
                          )}
                          {/* Contact */}
                          {visibleCols.includes("contact") && (
                            <td className="px-3 py-2">{task.contact}</td>
                          )}
                          {/* Due Date */}
                          {visibleCols.includes("dueDate") && (
                            <td className="px-3 py-2">
                              {task.dueDate}
                              {task.dueTime && (
                                <span className="text-xs text-gray-400 ml-2">
                                  {task.dueTime}
                                </span>
                              )}
                            </td>
                          )}
                          {/* Priority */}
                          {visibleCols.includes("priority") && (
                            <td className="px-3 py-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-bold ${PRIORITY_COLORS[task.priority]}`}
                              >
                                {task.priority}
                              </span>
                            </td>
                          )}
                          {/* Assigned */}
                          {visibleCols.includes("assigned") && (
                            <td className="px-3 py-2">
                              <div className="flex gap-1 flex-wrap">
                                {task.assigned.map(person => (
                                  <span
                                    key={person}
                                    className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-semibold"
                                  >
                                    <User2 size={13} />
                                    {person}
                                  </span>
                                ))}
                              </div>
                            </td>
                          )}
                          {/* Actions */}
                          {visibleCols.includes("actions") && (
                            <td className="px-3 py-2 text-right">
                              <div className="flex gap-2">
                                <button className="text-green-500 hover:text-green-700">
                                  <CheckCircle2 size={16} />
                                </button>
                                <button className="text-red-500 hover:text-red-700">
                                  <Trash2 size={16} />
                                </button>
                                <button className="text-gray-500 hover:text-blue-600">
                                  <MoreHorizontal size={16} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
        )}
      </div>
    </div>
  );
};

export default Tasks;
