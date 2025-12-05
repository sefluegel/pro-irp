// src/pages/ForgotPassword.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { requestPasswordReset } from "../api";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    try {
      await requestPasswordReset(email);
      setMsg("If the email exists, a code was created. In DEV, check the backend console for the code.");
      setTimeout(() => {
        nav(`/reset?email=${encodeURIComponent(email)}`, { replace: true });
      }, 800);
    } catch (e) {
      setErr("Unable to request reset.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F2A43] via-[#0E3F73] to-[#0A69B8] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden">
        <div className="h-2 bg-amber-400" />
        <div className="px-8 pt-8 text-center">
          <h1 className="text-2xl font-bold text-slate-800">{t('forgotPasswordTitle')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('resetCodeMessage')}</p>
        </div>
        <form onSubmit={onSubmit} className="px-8 pt-6 pb-8">
          {msg && <div className="mb-3 text-green-700 text-sm">{msg}</div>}
          {err && <div className="mb-3 text-red-600 text-sm">{err}</div>}
          <label className="block text-sm text-slate-700 mb-1">{t('emailLabel')}</label>
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 mb-5"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <button className="w-full bg-slate-900 text-white rounded-lg py-2.5 font-medium hover:opacity-95 active:opacity-90">
            {t('sendCode')}
          </button>
        </form>
      </div>
    </div>
  );
}
