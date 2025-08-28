import React from "react";
import { User, TrendingUp, UserMinus, PlusCircle, Calendar } from "lucide-react";

const cards = [
  {
    icon: <User size={32} className="text-[#FFB800]" />,
    label: "Total Clients",
    value: "287",
  },
  {
    icon: <TrendingUp size={32} className="text-[#172A3A]" />,
    label: "Retention Rate",
    value: "92.3%",
  },
  {
    icon: <UserMinus size={32} className="text-red-500" />,
    label: "Churned Clients",
    value: "5 (30d)",
  },
  {
    icon: <PlusCircle size={32} className="text-green-500" />,
    label: "New Clients",
    value: "13 (this month)",
  },
  {
    icon: <Calendar size={32} className="text-[#007cf0]" />,
    label: "Tasks Due",
    value: "7",
  }
];

const MetricCards = () => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
    {cards.map(({ icon, label, value }) => (
      <div key={label} className="bg-white rounded-2xl shadow p-5 flex flex-col items-center text-center border-t-4" style={{ borderTopColor: label === "Retention Rate" ? "#FFB800" : "#20344A" }}>
        <div className="mb-2">{icon}</div>
        <div className="text-2xl font-bold text-[#172A3A]">{value}</div>
        <div className="text-sm text-[#20344A]">{label}</div>
      </div>
    ))}
  </div>
);

export default MetricCards;
