// /frontend/src/pages/Tasks.jsx
import React, { useState } from "react";
import {
  CheckCircle,
  Clock,
  Trash2,
  Search,
  Filter,
  SlidersHorizontal,
  User,
  Mail,
  Phone,
  MessageCircle,
  Plus,
  CalendarDays,
  Star,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react";

const MOCK_TASKS = [
  {
    id: 1,
    title: "Call client for policy review",
    contact: "Jane Doe",
    due: "2025-08-07",
    time: "10:00",
    status: "Due Today",
    type: "call",
    priority: "High",
    tags: ["Review", "Medicare"],
    owner: "Scott Fluegel",
    assignedTo: ["Scott Fluegel", "Spencer"],
    description: "Annual review—remind client about new plan options.",
  },
  {
    id: 2,
    title: "Send happy birthday SMS",
    contact: "Zain Marketing",
    due: "2025-08-07",
    time: "09:30",
    status: "Due Today",
    type: "sms",
    priority: "Low",
    tags: ["Birthday"],
    owner: "You",
    assignedTo: ["Scott Fluegel"],
    description: "",
  },
  {
    id: 3,
    title: "Complete SOA for Janik",
    contact: "Janik Lilienthal",
    due: "2025-08-08",
    time: "15:00",
    status: "Upcoming",
    type: "email",
    priority: "Medium",
    tags: ["Compliance", "SOA"],
    owner: "You",
    assignedTo: ["Cherie Fluegel"],
    description: "",
  },
  {
    id: 4,
    title: "Check-in call: new Rx alert",
    contact: "Scott Fluegel",
    due: "2025-08-05",
    time: "16:00",
    status: "Overdue",
    type: "call",
    priority: "High",
    tags: ["Rx", "Retention"],
    owner: "Spencer",
    assignedTo: ["Spencer"],
    description: "Lisinopril prescribed, tier 4. Discuss with client.",
  },
];

// Priority color mapping
const PRIORITY_COLORS = {
  High: "bg-red-100 text-red-800",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-green-100 text-green-800",
};

// Tag color mapping
const TAG_COLORS = {
  Review: "bg-blue-100 text-blue-800",
  Medicare: "bg-purple-100 text-purple-800",
  Birthday: "bg-pink-100 text-pink-800",
  Compliance: "bg-gray-100 text-gray-700",
  SOA: "bg-yellow-100 text-yellow-800",
  Rx: "bg-indigo-100 text-indigo-800",
  Retention: "bg-teal-100 text-teal-800",
};

// Task type icons
const TYPE_ICONS = {
  call: <Phone size={16} className="text-green-600" />,
  sms: <MessageCircle size={16} className="text-blue-600" />,
  email: <Mail size={16} className="text-yellow-700" />,
  meeting: <CalendarDays size={16} className="text-purple-600" />,
};

const STATUS_SECTIONS = [
  { key: "Due Today", label: "Due Today" },
  { key: "Upcoming", label: "Upcoming" },
  { key: "Overdue", label: "Overdue" },
  { key: "Completed", label: "Completed" },
];

const Tasks = () => {
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");

  // Filter, Search, Sort logic
  const filteredTasks = tasks.filter(task =>
    (filterStatus === "All" || task.status === filterStatus) &&
    (search === "" ||
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.contact.toLowerCase().includes(search.toLowerCase()) ||
      (task.tags && task.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase())))
    )
  );

  const groupByStatus = STATUS_SECTIONS.reduce((acc, s) => {
    acc[s.key] = filteredTasks.filter(t => t.status === s.key);
    return acc;
  }, {});

  // Bulk actions
  const handleSelectAll = e =>
    setSelected(e.target.checked ? filteredTasks.map(t => t.id) : []);
  const handleSelect = id =>
    setSelected(sel => sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);
  const handleBulkComplete = () => {
    setTasks(ts => ts.map(t => selected.includes(t.id) ? { ...t, status: "Completed" } : t));
    setSelected([]);
  };
  const handleBulkDelete = () => {
    setTasks(ts => ts.filter(t => !selected.includes(t.id)));
    setSelected([]);
  };

  // Task quick actions (simulate for demo)
  const handleComplete = id => setTasks(ts => ts.map(t => t.id === id ? { ...t, status: "Completed" } : t));
  const handleSnooze = id => setTasks(ts => ts.map(t => t.id === id ? { ...t, due: "2025-08-08", status: "Upcoming" } : t));
  const handleDelete = id => setTasks(ts => ts.filter(t => t.id !== id));

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 font-[Inter]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#172A3A]">Tasks</h1>
          <p className="text-gray-500">Track, manage, and complete your upcoming activities.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-[#FFB800] text-[#172A3A] px-4 py-2 rounded-xl font-bold hover:bg-yellow-400 transition"
          >
            <Plus size={18} /> Add Task
          </button>
          <button
            onClick={handleBulkComplete}
            disabled={!selected.length}
            className="flex items-center gap-2 bg-green-100 border border-green-200 px-4 py-2 rounded-xl font-bold hover:bg-green-200 text-green-900 transition"
          >
            <CheckCircle size={18} /> Complete
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={!selected.length}
            className="flex items-center gap-2 bg-white border px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition"
          >
            <Trash2 size={18} /> Delete
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          <button
            className={`flex items-center gap-1 px-3 py-1 rounded border text-xs font-semibold shadow-sm
              ${filterStatus === "All" ? "bg-[#172A3A] text-white" : "bg-white hover:bg-gray-100 text-[#172A3A]"}
            `}
            onClick={() => setFilterStatus("All")}
          >
            All
          </button>
          {STATUS_SECTIONS.map(s => (
            <button
              key={s.key}
              className={`flex items-center gap-1 px-3 py-1 rounded border text-xs font-semibold shadow-sm
                ${filterStatus === s.key ? "bg-[#FFB800] text-[#172A3A]" : "bg-white hover:bg-gray-100 text-[#172A3A]"}
              `}
              onClick={() => setFilterStatus(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1 px-3 py-1 rounded bg-white border shadow-sm hover:bg-gray-50 text-xs"
            onClick={() => alert("Column chooser coming soon!")}
          >
            <SlidersHorizontal size={14} /> Columns
          </button>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="pl-8 pr-2 py-1 rounded border shadow-sm text-xs"
            />
          </div>
          <button
            onClick={() => alert("Filters coming soon!")}
            className="flex items-center gap-1 px-3 py-1 rounded bg-white border shadow-sm hover:bg-gray-50 text-xs"
          >
            <Filter size={14} /> Filters
          </button>
        </div>
      </div>

      {/* TASK LIST */}
      {STATUS_SECTIONS.map(({ key: sectionKey, label }) => (
        groupByStatus[sectionKey]?.length > 0 && (
          <div key={sectionKey} className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              {sectionKey === "Overdue" && <Clock size={18} className="text-red-400" />}
              {sectionKey === "Due Today" && <Star size={18} className="text-yellow-500" />}
              <h2 className="text-lg font-bold text-[#172A3A]">{label}</h2>
              <span className="text-xs text-gray-400 font-medium">{groupByStatus[sectionKey].length} task{groupByStatus[sectionKey].length > 1 ? "s" : ""}</span>
            </div>
            <div className="bg-white rounded-xl shadow divide-y">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-[#172A3A] bg-gray-50">
                    <th className="w-6 px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selected.length && groupByStatus[sectionKey].every(t => selected.includes(t.id))}
                        onChange={e =>
                          setSelected(sel => e.target.checked
                            ? [...sel, ...groupByStatus[sectionKey].map(t => t.id).filter(id => !sel.includes(id))]
                            : sel.filter(id => !groupByStatus[sectionKey].some(t => t.id === id))
                          )
                        }
                      />
                    </th>
                    <th className="w-10"></th>
                    <th>Task</th>
                    <th>Contact</th>
                    <th>Due</th>
                    <th>Priority</th>
                    <th>Tags</th>
                    <th>Assigned</th>
                    <th className="w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {groupByStatus[sectionKey].map(task => (
                    <tr
                      key={task.id}
                      className={`hover:bg-yellow-50 ${task.status === "Overdue" ? "bg-red-50" : ""}`}
                    >
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selected.includes(task.id)}
                          onChange={() => handleSelect(task.id)}
                        />
                      </td>
                      <td className="px-2 text-center">
                        {TYPE_ICONS[task.type]}
                      </td>
                      <td className="px-2 py-2 font-bold">
                        {task.title}
                        {task.description && (
                          <div className="text-gray-400 text-xs font-normal">{task.description}</div>
                        )}
                      </td>
                      <td className="px-2 py-2">{task.contact}</td>
                      <td className="px-2 py-2">
                        <span className="font-medium">
                          {task.due} <span className="text-xs text-gray-400">{task.time}</span>
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          {task.tags.map(tag => (
                            <span key={tag} className={`px-2 py-0.5 rounded-full text-xs font-bold ${TAG_COLORS[tag] || "bg-gray-100 text-gray-600"}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          {task.assignedTo.map(user => (
                            <span key={user} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                              <User size={12} /> {user}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right flex gap-2">
                        {/* Actions: Complete, Snooze, Delete, More */}
                        {task.status !== "Completed" && (
                          <button
                            className="bg-green-100 hover:bg-green-200 text-green-900 rounded px-2 py-1 text-xs font-semibold"
                            onClick={() => handleComplete(task.id)}
                            title="Complete Task"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        {task.status !== "Completed" && (
                          <button
                            className="bg-gray-100 hover:bg-yellow-100 text-yellow-700 rounded px-2 py-1 text-xs font-semibold"
                            onClick={() => handleSnooze(task.id)}
                            title="Snooze to Tomorrow"
                          >
                            <Clock size={16} />
                          </button>
                        )}
                        <button
                          className="bg-white hover:bg-red-100 text-red-700 rounded px-2 py-1 text-xs font-semibold"
                          onClick={() => handleDelete(task.id)}
                          title="Delete Task"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          className="bg-white hover:bg-gray-200 text-gray-600 rounded px-2 py-1 text-xs font-semibold"
                          onClick={() => alert("More options coming soon!")}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ))}

      {/* Quick Add Task Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-[420px] max-w-[95vw] p-6 relative">
            <button
              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-black"
              onClick={() => setShowAdd(false)}
            >✕</button>
            <h2 className="text-xl font-bold text-[#172A3A] mb-2">Add Task</h2>
            <p className="text-gray-500 text-xs mb-3">(*Demo only, not connected)</p>
            <form className="space-y-2">
              <input className="w-full px-3 py-2 border rounded text-sm" placeholder="Task Title" />
              <input className="w-full px-3 py-2 border rounded text-sm" placeholder="Contact" />
              <input className="w-full px-3 py-2 border rounded text-sm" placeholder="Due Date" type="date" />
              <input className="w-full px-3 py-2 border rounded text-sm" placeholder="Time" type="time" />
              <input className="w-full px-3 py-2 border rounded text-sm" placeholder="Tags (comma separated)" />
              <select className="w-full px-3 py-2 border rounded text-sm">
                <option>Priority</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
              <select className="w-full px-3 py-2 border rounded text-sm">
                <option>Type</option>
                <option value="call">Call</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
              </select>
              <textarea className="w-full px-3 py-2 border rounded text-sm" placeholder="Description (optional)" />
              <button
                type="button"
                className="w-full bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] font-bold py-2 rounded-xl shadow"
                onClick={() => setShowAdd(false)}
              >Save (Demo)</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
