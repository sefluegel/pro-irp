import React from "react";
import { Plus, RefreshCcw, Mail } from "lucide-react";

const ActionBar = () => (
  <div className="flex flex-wrap gap-4">
    <button className="flex items-center gap-2 bg-[#FFB800] text-[#172A3A] font-bold px-5 py-2 rounded-lg shadow hover:bg-yellow-400 transition">
      <Plus size={18} /> Add Client
    </button>
    <button className="flex items-center gap-2 bg-[#172A3A] text-white font-bold px-5 py-2 rounded-lg shadow hover:bg-[#20344A] transition">
      <RefreshCcw size={18} /> Start Policy Review
    </button>
    <button className="flex items-center gap-2 bg-[#20344A] text-[#FFB800] font-bold px-5 py-2 rounded-lg shadow hover:bg-[#172A3A] transition">
      <Mail size={18} /> Send Broadcast
    </button>
  </div>
);

export default ActionBar;
