import React from "react";

const DashboardHeader = () => (
  <div className="flex items-center justify-between pb-6">
    <div className="flex items-center gap-4">
      <img src="/logo.png" alt="Pro IRP Logo" className="w-12 h-12 rounded-full bg-white shadow" />
      <div>
        <div className="text-2xl font-extrabold text-[#172A3A] tracking-tight">
          Dashboard
        </div>
        <div className="text-sm text-[#20344A] font-medium">
          Welcome back to Pro <span className="text-[#FFB800]">IRP</span>!
        </div>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <span className="font-semibold text-[#172A3A]">John Agent</span>
      <img src="https://ui-avatars.com/api/?name=John+Agent&background=172A3A&color=fff&size=48" alt="User" className="w-10 h-10 rounded-full" />
    </div>
  </div>
);

export default DashboardHeader;
