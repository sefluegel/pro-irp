// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { setToken } from "../auth/Auth";
import { login } from "../api";

export default function Login() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [logoError, setLogoError] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      const data = await login(email, pwd);
      setToken(data.token);
      const from = location.state?.from?.pathname || "/dashboard";
      nav(from, { replace: true });
    } catch (e) {
      setErr(typeof e?.message === "string" ? e.message : t('login') + " failed");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F2A43] via-[#0E3F73] to-[#0A69B8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden">
          {/* Top accent */}
          <div className="h-2 bg-amber-400" />

          {/* Header w/ logo */}
          <div className="px-8 pt-8 text-center">
            <div className="w-16 h-16 rounded-full bg-white shadow mx-auto -mt-10 ring-1 ring-black/5 flex items-center justify-center">
              {/* Uses your public/logo.png */}
              {!logoError ? (
                <img
                  src="/logo.png"
                  alt="Pro IRP"
                  className="w-12 h-12 object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="text-xs font-semibold tracking-wider">PRO IRP</span>
              )}
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-800">
              Pro <span className="text-amber-500">IRP</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {t('nextGenInsurance')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="px-8 pt-6 pb-8">
            {err ? (
              <div className="mb-3 text-red-600 text-sm">{err}</div>
            ) : null}

            <label className="block text-sm text-slate-700 mb-1">{t('emailLabel')}</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 mb-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <label className="block text-sm text-slate-700 mb-1">{t('passwordLabel')}</label>
            <input
              type="password"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 mb-5"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoComplete="current-password"
            />

            <button className="w-full bg-slate-900 text-white rounded-lg py-2.5 font-medium hover:opacity-95 active:opacity-90">
              {t('logIn')}
            </button>
          </form>

          {/* Footer links */}
          <div className="px-8 pb-6 text-center text-sm flex items-center justify-center gap-6">
            <Link to="/forgot" className="text-slate-500 hover:text-slate-700 underline">
              {t('forgotPassword')}
            </Link>
            <Link to="/signup" className="text-slate-500 hover:text-slate-700 underline">
              {t('signUp')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
