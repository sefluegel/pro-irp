// /frontend/src/components/ActionBar.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Plus, RefreshCcw, Mail } from "lucide-react";

const ActionBar = () => (
  <div className="flex flex-wrap gap-4">
    <Link
      to="/clients/new"
      className="flex items-center gap-2 bg-[#FFB800] text-[#172A3A] font-bold px-5 py-2 rounded-lg shadow hover:bg-yellow-400 transition"
    >
      <Plus size={18} /> Add Client
    </Link>
    <Link
      to="/policies/review"
      className="flex items-center gap-2 bg-[#172A3A] text-white font-bold px-5 py-2 rounded-lg shadow hover:bg-[#20344A] transition"
    >
      <RefreshCcw size={18} /> Start Policy Review
    </Link>
    <Link
      to="/broadcast"
      className="flex items-center gap-2 bg-[#20344A] text-[#FFB800] font-bold px-5 py-2 rounded-lg shadow hover:bg-[#172A3A] transition"
    >
      <Mail size={18} /> Send Broadcast
    </Link>
  </div>
);

export default ActionBar;
