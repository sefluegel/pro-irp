// /frontend/src/pages/ClientProfile.jsx
import React from "react";
import { PieChart, Pie, Cell } from "recharts";
import { Phone, Mail, MessageCircle, Edit2, FileText } from "lucide-react";

// Example static data for pie chart (risk score)
const COLORS = ["#FF4D4D", "#FFB800", "#20C997"]; // Red, Gold, Green, etc.
const pieData = [
  { name: "Risk Score", value: 72 },
  { name: "Remaining", value: 28 },
];

const client = {
  name: "Patricia Garrett",
  phone: "(513) 702-3199",
  email: "stillbelieve54@gmail.com",
  tags: ["MAPD", "High Risk"],
  status: "Active",
  owner: "Scott Fluegel",
  // Add all your custom fields here!
};

const ClientProfile = () => (
  <div className="max-w-4xl mx-auto p-6">
    {/* Top: Name and quick actions */}
    <div className="flex flex-col md:flex-row gap-8 items-center justify-between mb-8">
      {/* Avatar and Name */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-[#172A3A] rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md border-2 border-[#FFB800]">
          {client.name.split(" ").map(word => word[0]).join("").toUpperCase()}
        </div>
        <div>
          <div className="text-2xl font-extrabold text-[#172A3A]">{client.name}</div>
          <div className="flex gap-2 text-sm text-gray-600 mt-1">
            <span className="bg-[#FFB800] text-[#172A3A] px-2 py-0.5 rounded-full font-semibold">Active</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">MAPD</span>
          </div>
        </div>
      </div>
      {/* Quick action icons */}
      <div className="flex gap-3">
        <button className="p-2 rounded hover:bg-blue-50" title="Call"><Phone size={20} className="text-blue-700" /></button>
        <button className="p-2 rounded hover:bg-blue-50" title="Email"><Mail size={20} className="text-yellow-500" /></button>
        <button className="p-2 rounded hover:bg-blue-50" title="SMS"><MessageCircle size={20} className="text-green-600" /></button>
        <button className="p-2 rounded hover:bg-blue-50" title="Edit"><Edit2 size={20} className="text-gray-500" /></button>
        <button className="p-2 rounded hover:bg-blue-50" title="Docs"><FileText size={20} className="text-gray-500" /></button>
      </div>
    </div>
    {/* Pie Chart + Take Action row */}
    <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
      {/* Risk Pie Chart */}
      <div className="flex flex-col items-center">
        <PieChart width={160} height={160}>
          <Pie
            data={pieData}
            dataKey="value"
            innerRadius={60}
            outerRadius={80}
            startAngle={90}
            endAngle={-270}
            paddingAngle={2}
          >
            {pieData.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={COLORS[i]} />
            ))}
          </Pie>
        </PieChart>
        <div className="absolute font-bold text-3xl text-[#172A3A]" style={{ marginTop: "-95px" }}>72</div>
        <div className="text-sm text-gray-500 mt-2">Risk Score</div>
      </div>
      {/* Take Action button and status */}
      <div className="flex flex-col items-center md:items-start gap-3">
        <button className="bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] font-bold px-6 py-3 rounded-2xl shadow-lg text-lg transition">
          Take Action
        </button>
        {/* Add status, last contact, client since, etc. here */}
        <div className="text-gray-500 text-sm mt-2">Client since: July 2022</div>
        <div className="text-gray-500 text-sm">Last contact: 4 days ago</div>
      </div>
    </div>
    {/* The rest of your profile page goes here (forms, outreach logs, docs, etc.) */}
    <div className="bg-white rounded-xl shadow p-6">
      {/* ... More details/logs here ... */}
      <div className="text-gray-700 text-sm">
        <b>Phone:</b> {client.phone} <br />
        <b>Email:</b> {client.email} <br />
        <b>Owner:</b> {client.owner} <br />
        {/* Add more fields as you wish */}
      </div>
    </div>
  </div>
);

export default ClientProfile;
