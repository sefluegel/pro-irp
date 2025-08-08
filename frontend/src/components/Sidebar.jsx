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
    const target = new Date(year, 9, 15, 0, 0, 0, 0); // October (0-indexed)
    const diffMs = target.getTime() - now.getTime();
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return days;
  })();

  // OEP season active? (Jan–Mar)
  const oepBadge = (() => {
    const now = new Date();
    const inSeason = now.getMonth() <= 2; // 0,1,2 = Jan–Mar
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
    { to: "/dashboard",   label: "Dashboard",   icon: <LayoutDashboard size={20} /> },
    { to: "/aep-wizard",  label: "AEP Wizard",  icon: <CalendarDays size={20} />, badge: `${daysUntilAEP}d` },
    { to: "/oep",         label: "OEP Hub",     icon: <Shield size={20} />,       badge: oepBadge },
    { to: "/clients",     label: "Clients",     icon: <Users size={20} /> },
    { to: "/tasks",       label: "Tasks",       icon: <ListChecks size={20} /> },
    { to: "/automations", label: "Automations", icon: <Smile size={20} /> },
    { to: "/settings",    label: "Settings",    icon: <Settings size={20} /> },
  ];

  const authLinks = [
    { to: "/",       label: "Login",   icon: <LogIn size={20} /> },
    { to: "/signup", label: "Sign Up", icon: <UserPlus size={20} /> },
  ];

  const links = dashboardMode ? dashboardLinks : authLinks;

  return (
