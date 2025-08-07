import React from "react";
import { Plus } from "lucide-react";

const ActionBar = () => (
  <div className="flex flex-wrap gap-4">
    <button className="flex items-center gap-2 bg-[#FFB800] text-[#172A3A] font-bold px-5 py-2 rounded-lg shadow hover:bg-yellow-400 transition">
      <Plus size={18} /> Add Client
    </button>
  </div>
);

export default ActionBar;
