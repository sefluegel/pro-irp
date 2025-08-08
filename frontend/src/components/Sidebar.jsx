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
  CalendarDays, // <-- AEP Wizard icon
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
    const target = new Date(year, 9, 15, 0, 0, 0, 0); // October = 9
    const diffMs = target.getTime() - now.getTime();
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return days;
  })();

  const dashboardMode = [
    "/dashboard",
    "/clients",
    "/tasks",
    "/settings",
    "/automations",
    "/aep-wizard", // <-- include AEP Wizard route in dashboard mode
  ].some((path) => location.pathname.startsWith(path));

  // Add AEP Wizard + Automations to your dashboard links
  const dashboardLinks = [
    { to: "/dashboard",   label: "Dashboard",   icon: <LayoutDashboard size={20} /> },
    { to: "/aep-wizard",  label: "AEP Wizard",  icon: <CalendarDays size={20} />, badge: `${daysUntilAEP}d` }, // <-- NEW
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
          Pro <span className="text-white">IRP</span
