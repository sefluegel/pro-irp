// src/pages/ResetPassword.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api";
import { setToken } from "../auth/Auth";

export default function ResetPassword() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const e = params.get("email");
    if (e) setEmail(e);
  }, [params]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (pwd1 !== pwd2) { setErr("Passwords do not match"); return; }
    try {
      const data = await resetPassword(email, code, pwd1);
      setToken(data.token);
      nav("/dashboard", { replace: true });
    } catch (e) {
      setErr(typeof e?.message === "string" ? e.message : "Reset failed");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F2A43] via-[#0E3F73] to-[#0A69B8] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl ring-1 ring-black/5 overflow-hidden">
        <div className="h-2 bg-amber-400" />
        <div className="px-8 pt-8 text-center">
          <h1 className="text-2xl font-bold text-slate-800">Reset Password</h1>
          <p className="text-sm text-slate-500 mt-1">Enter the 6-digit code and your new password.</p>
        </div>
        <form onSubmit={onSubmit} className="px-8 pt-6 pb-8">
          {err && <div className="mb-3 text-red-600 text-sm">{err}</div>}
          <label className="block text-sm text-slate-700 mb-1">Email</label>
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-3"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            autoComplete="email"
          />
          <label className="block text-sm text-slate-700 mb-1">Reset Code</label>
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-3"
            value={code}
            onChange={(e)=>setCode(e.target.value)}
            placeholder="6-digit code"
          />
          <label className="block text-sm text-slate-700 mb-1">New Password</label>
          <input
            type="password"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-3"
            value={pwd1}
            onChange={(e)=>setPwd1(e.target.value)}
            autoComplete="new-password"
          />
          <label className="block text-sm text-slate-700 mb-1">Confirm New Password</label>
          <input
            type="password"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-5"
            value={pwd2}
            onChange={(e)=>setPwd2(e.target.value)}
            autoComplete="new-password"
          />
          <button className="w-full bg-slate-900 text-white rounded-lg py-2.5 font-medium hover:opacity-95 active:opacity-90">
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}
