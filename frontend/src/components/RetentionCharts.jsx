// /frontend/src/components/RetentionCharts.jsx

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const trendData = [
  { month: "Jan", retention: 94 },
  { month: "Feb", retention: 93 },
  { month: "Mar", retention: 95 },
  { month: "Apr", retention: 94 },
  { month: "May", retention: 96 },
  { month: "Jun", retention: 95 },
  { month: "Jul", retention: 96 },
  { month: "Aug", retention: 97 },
  { month: "Sep", retention: 96 },
  { month: "Oct", retention: 97 },
  { month: "Nov", retention: 98 },
  { month: "Dec", retention: 98 },
];

const churnData = [
  { name: "Plan change", value: 42 },
  { name: "Service issues", value: 28 },
  { name: "Moved / eligibility", value: 18 },
  { name: "Other", value: 12 },
];

const PIE_COLORS = ["#2E5C99", "#5AA0E6", "#78B0F0", "#A2D2FF"];

export default function RetentionCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Retention Trend (Line) */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#172A3A] text-lg">Retention Trend (Demo)</h3>
          <span className="text-xs text-gray-500">Sample data</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
              <CartesianGrid stroke="#edf2f7" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis domain={[80, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => [`${v}%`, "Retention"]} />
              <Line
                type="monotone"
                dataKey="retention"
                stroke="#2E5C99"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Churn Breakdown (Pie) */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#172A3A] text-lg">Churn Breakdown (Demo)</h3>
          <span className="text-xs text-gray-500">Sample data</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={churnData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                {churnData.map((entry, idx) => (
                  <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" height={24} />
              <Tooltip formatter={(v, name) => [`${v}%`, name]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
