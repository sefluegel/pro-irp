// src/layouts/AppLayout.jsx
import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/Sidebar";
import { clearToken } from "../auth/Auth";

export default function AppLayout() {
  const { t } = useTranslation();
  const nav = useNavigate();

  function onLogout() {
    clearToken();
    nav("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Left sidebar (your component) */}
      <aside className="w-64 bg-white border-r">
        <Sidebar />
      </aside>

      {/* Main content */}
      <main className="flex-1">
        {/* Top bar */}
        <div className="h-14 bg-white border-b flex items-center justify-between px-4">
          <div className="text-sm text-gray-600">{t('welcomeBack')}</div>
          <button
            onClick={onLogout}
            className="text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50"
          >
            {t('logOut')}
          </button>
        </div>

        {/* Page content */}
        <div className="p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
