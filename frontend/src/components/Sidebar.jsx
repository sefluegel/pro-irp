// /frontend/src/components/Sidebar.jsx

import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ListChecks,
  Settings,
  Smile,
  LogIn,
  UserPlus,
  CalendarDays, // AEP Wizard icon
  Shield,       // OEP Hub icon
} from "lucide-react";

const Sidebar = () => {
  const location = useLocation();

  // Days remaining until next Oct 15 (AEP start)
  const daysUntilAEP = (() => {
    const now = new Date();
    const year =
      now.getMonth() > 9 || (now.getMonth() === 9 && now.getDate() > 15)
        ? now.getFullYear() + 1
        : now.getFullYear();
    // Month is 0-indexed; 9 = October
    const target = new Date(year, 9, 15, 0, 0, 0, 0);
    const diffMs = target.getTime() - now.getTime();
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return days;
  })();

  // OEP season active? (Jan–Mar)
  const oepBadge = (() => {
    const now = new Date();
    const inSeason = now.getMonth() <= 2; // Jan=0..Mar=2
    return inSeason ? "OEP" : undefined;
  })();

  const dashboardMode = [
    "/dashboard",
    "/clients",
    "/tasks",
    "/settings",
    "/automations",
    "/aep-wizard",
    "/oep",
  ].some((path) => location.pathname.startsWith(path));

  const dashboardLinks = [
    { to: "/dashboard",   label: "Dashboard",  icon: <LayoutDashboard size={20} /> },
    { to: "/aep-wizard",  label: "AEP Wizard", icon: <CalendarDays size={20} />, badge: `${daysUntilAEP}d` },
    { to: "/oep",         label: "OEP Hub",    icon: <Shield size={20} />,       badge: oepBadge },
    { to: "/clients",     label: "Clients",    icon: <Users size={20} /> },
    { to: "/tasks",       label: "Tasks",      icon: <ListChecks size={20} /> },
    { to: "/automations", label: "Automations",icon: <Smile size={20} /> },
    { to: "/settings",    label: "Settings",   icon: <Settings size={20} /> },
  ];

  const authLinks = [
    { to: "/",       label: "Login",   icon: <LogIn size={20} /> },
    { to: "/signup", label: "Sign Up", icon: <UserPlus size={20} /> },
  ];

  const links = dashboardMode ? dashboardLinks : authLinks;

  return (
    <aside
      className="w-64 min-h-screen flex flex-col font-[Inter] shadow-2xl"
      style={{ background: "#172A3A" }}
    >
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
          {links.map(({ to, label, icon, badge }) => {
            const isActive =
              location.pathname === to || location.pathname.startsWith(`${to}/`);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl text-lg font-semibold transition
                    ${
                      isActive
                        ? "bg-[#20344A] text-[#FFB800]"
                        : "text-white hover:bg-[#20344A] hover:text-[#FFB800]"
                    }
                  `}
                >
                  {icon}
                  {label}
                  {badge && (
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold
                        ${
                          isActive
                            ? "bg-white text-[#172A3A]"
                            : "bg-[#FFB800] text-[#172A3A]"
                        }
                      `}
                      title={
                        label === "AEP Wizard"
                          ? "Days until AEP (Oct 15)"
                          : "OEP Season (Jan–Mar)"
                      }
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
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
