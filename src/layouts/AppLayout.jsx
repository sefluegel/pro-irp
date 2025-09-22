import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

/**
 * App shell that uses YOUR Sidebar component.
 * The <Outlet /> is where the active page (Dashboard, Clients, etc.) renders.
 */
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Left sidebar (your component) */}
      <aside className="w-64 bg-white border-r">
        <Sidebar />
      </aside>

      {/* Main content */}
      <main className="flex-1">
        {/* Simple top bar */}
        <div className="h-14 bg-white border-b flex items-center justify-between px-4">
          <div className="text-sm text-gray-600">Welcome back to Pro IRP!</div>
          <div className="text-sm text-gray-500">John Agent</div>
        </div>

        {/* Page content */}
        <div className="p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
