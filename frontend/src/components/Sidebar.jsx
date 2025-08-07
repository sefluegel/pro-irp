// /frontend/src/components/Sidebar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  ListChecks,
  Settings,
  LogIn,
  UserPlus,
  // Mail,
  // MessageSquare,
  // Bell
} from "lucide-react";

// Dummy unread counts for demo (replace with real props/state as needed)
const unread = {
  messages: 2,
  emails: 1,
  alerts: 3,
};

const Sidebar = () => {
  const location = useLocation();

  // "Dashboard Mode" if on /dashboard or its subpages
  const dashboardMode = [
    "/dashboard",
    "/clients",
    "/policies",
    "/tasks",
    "/settings"
  ].some(path => location.pathname.startsWith(path));

  // Links for dashboard (main app)
  const dashboardLinks = [
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { to: "/clients",   label: "Clients",   icon: <Users size={20} /> },
    { to: "/policies",  label: "Policies",  icon: <FileText size={20} /> },
    { to: "/tasks",     label: "Tasks",     icon: <ListChecks size={20} /> },
    { to: "/settings",  label: "Settings",  icon: <Settings size={20} /> },
  ];

  // Links for authentication pages
  const authLinks = [
    { to: "/",        label: "Login",    icon: <LogIn size={20} /> },
    { to: "/signup",  label: "Sign Up",  icon: <UserPlus size={20} /> },
  ];

  const links = dashboardMode ? dashboardLinks : authLinks;

  return (
    <aside
      className="w-64 min-h-screen flex flex-col font-[Inter] shadow-2xl"
      style={{ background: "#172A3A" }}
    >
      {/* Logo/Home */}
      <Link
        to="/dashboard"
        className="flex flex-col items-center gap-2 px-6 py-8 border-b"
        style={{ borderColor: "#20344A" }}
      >
        <img
          src="/logo.png"
          alt="Pro IRP Logo"
          className="w-16 h-16 rounded-full shadow mb-2 bg-white"
          style={{ objectFit: "contain" }}
        />
        <span
          className="text-2xl font-extrabold tracking-tight"
          style={{ color: "#FFB800", letterSpacing: "-2px" }}
        >
          Pro <span className="text-white">IRP</span>
        </span>
      </Link>

      <nav className="flex-1 flex flex-col py-8 gap-2">
        <ul className="space-y-1">
          {links.map(({ to, label, icon, badge }) => (
            <li key={to}>
              <Link
                to={to}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl text-lg font-semibold transition
                  ${location.pathname === to
                    ? "bg-[#20344A] text-[#FFB800]"
                    : "text-white hover:bg-[#20344A] hover:text-[#FFB800]"}
                `}
              >
                {icon}
                {label}
                {badge && (
                  <span className="ml-auto bg-[#FFB800] text-[#172A3A] rounded-full px-2 py-0.5 text-xs font-bold">
                    {badge}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {dashboardMode && (
        <div className="mb-8 mt-auto px-6">
          <button
            className="flex items-center gap-2 w-full py-2 px-3 rounded-xl transition font-bold shadow"
            style={{ background: "#FFB800", color: "#172A3A" }}
          >
            Log Out
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
