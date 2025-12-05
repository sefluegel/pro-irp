import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";

async function fetchTasks() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/tasks/all`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch tasks");
  const json = await res.json();
  return json.data || [];
}

const statusColors = {
  overdue: "bg-red-100 text-red-700",
  dueToday: "bg-yellow-100 text-yellow-700",
  upcoming: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

function getTaskStatus(task) {
  if (task.status === "done" || task.status === "completed") return "completed";
  if (!task.dueDate) return "upcoming";

  const due = new Date(task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (due < today) return "overdue";
  if (due.toDateString() === today.toDateString()) return "dueToday";
  return "upcoming";
}

function formatDueDate(task, t) {
  if (!task.dueDate) return t('noDueDate');
  const due = new Date(task.dueDate);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (due.toDateString() === today.toDateString()) return t('today');
  if (due.toDateString() === tomorrow.toDateString()) return t('tomorrow');
  if (due < today) return t('overdue');

  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return `${diffDays}d`;
  return due.toLocaleDateString();
}

const TaskList = () => {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchTasks();
        // Show only incomplete tasks, sorted by due date, limit to 5
        const incomplete = data
          .filter(t => t.status !== "done" && t.status !== "completed")
          .sort((a, b) => {
            // Sort: overdue first, then by due date
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
          })
          .slice(0, 5);
        setTasks(incomplete);
      } catch (err) {
        console.error("Failed to load tasks:", err);
      } finally {
        setLoading(false);
      }
    }
    load();

    // Listen for task updates
    const onUpdate = () => load();
    window.addEventListener("tasks:update", onUpdate);
    return () => window.removeEventListener("tasks:update", onUpdate);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-6 border-t-4" style={{ borderTopColor: "#007cf0" }}>
        <div className="text-lg font-semibold text-[#172A3A] mb-4">{t('tasks')}</div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 border-t-4" style={{ borderTopColor: "#007cf0" }}>
      <div className="text-lg font-semibold text-[#172A3A] mb-4">{t('tasks')}</div>
      {tasks.length === 0 ? (
        <div className="text-gray-500 text-sm py-4">{t('noPendingTasks')}</div>
      ) : (
        <ul className="divide-y">
          {tasks.map((task) => {
            const status = getTaskStatus(task);
            const statusLabel = status === "dueToday" ? t('due') : status === "overdue" ? t('overdue') : t('upcoming');

            return (
              <li key={task.id} className="flex items-center justify-between py-3">
                <div className="flex-1">
                  <div className="font-medium">{task.title}</div>
                  {task.clientName && (
                    <div className="text-xs text-gray-500">{task.clientName}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{formatDueDate(task, t)}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[status]}`}>
                    {statusLabel}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default TaskList;
