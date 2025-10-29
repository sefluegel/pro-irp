import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

const TaskList = () => {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    api.listTasks().then(setTasks).catch(() => setTasks([]));
  }, []);

  const complete = async (id) => {
    try {
      const updated = await api.completeTask(id);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {}
  };

  return (
    <div
      className="bg-white rounded-2xl shadow p-6 border-t-4"
      style={{ borderTopColor: "#4F46E5" }}
    >
      <div className="text-lg font-semibold text-[#172A3A] mb-4">Tasks</div>
      <ul className="divide-y">
        {tasks.map((t) => (
          <li key={t.id} className="py-3 flex justify-between text-sm">
            <span>{t.title}</span>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded text-xs ${
                  t.status === "done"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {t.status}
              </span>
              {t.status !== "done" && (
                <button
                  onClick={() => complete(t.id)}
                  className="px-2 py-1 rounded bg-indigo-600 text-white"
                >
                  Complete
                </button>
              )}
            </div>
          </li>
        ))}
        {tasks.length === 0 && (
          <li className="py-3 text-sm text-gray-400">No tasks yet.</li>
        )}
      </ul>
    </div>
  );
};

export default TaskList;

