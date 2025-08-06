import React from "react";

// Placeholder chart images or SVGs—replace with real charts later
const RetentionCharts = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
    <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center border-t-4" style={{ borderTopColor: "#007cf0" }}>
      <div className="text-lg font-semibold text-[#172A3A] mb-3">Retention Trend</div>
      <img src="https://placehold.co/320x120?text=Line+Chart" alt="Retention Trend" className="rounded" />
    </div>
    <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center border-t-4" style={{ borderTopColor: "#FFB800" }}>
      <div className="text-lg font-semibold text-[#172A3A] mb-3">Churn Rate</div>
      <img src="https://placehold.co/180x120?text=Pie+Chart" alt="Churn Rate" className="rounded" />
    </div>
  </div>
);

export default RetentionCharts;
