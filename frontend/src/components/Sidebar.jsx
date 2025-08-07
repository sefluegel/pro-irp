// /frontend/src/components/Sidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  const linkClass = path =>
    `flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-lg hover:bg-blue-100 transition
     ${location.pathname.startsWith(path) ? "bg-blue-700 text-white" : "text-blue-900"}`;

  return (
    <aside className="w-64 bg-[#172A3A] min-h-screen flex flex-col py-8 px-2 shadow-xl">
      <h1 className="text-3xl font-extrabold text-[#FFB800] mb-10 ml-4 flex items-center gap-2">
        <img src="/logo.png" alt="logo" className="h-8 mr-2" /> Pro IRP
      </h1>
      <nav className="flex-1">
        <ul className="space-y-2">
          <li>
            <Link to="/dashboard" className={linkClass("/dashboard")}>📊 Dashboard</Link>
          </li>
          <li>
            <Link to="/clients" className={linkClass("/clients")}>👥 Clients</Link>
          </li>
          <li>
            <Link to="/login" className={linkClass("/login")}>🔑 Login</Link>
          </li>
          <li>
            <Link to="/signup" className={linkClass("/signup")}>🆕 Sign Up</Link>
          </li>
        </ul>
      </nav>
      <div className="mt-auto text-blue-200 text-sm ml-5 mb-3">
        © 2025 Pro IRP
      </div>
    </aside>
  );
};

export default Sidebar;
