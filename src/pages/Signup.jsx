import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { setToken } from "../auth/Auth";
import { Building2, Users, Mail } from "lucide-react";

const Signup = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite"); // Check for invitation token in URL

  const [selectedRole, setSelectedRole] = useState(inviteToken ? "agent" : "agency");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    agencyName: "",
    agentCount: "5",
    promoCode: "",
    invitationToken: inviteToken || ""
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");

    // Validation
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setErr(t('emailLabel') + " " + t('passwordLabel') + " required");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErr(t('passwordLabel') + " do not match");
      return;
    }

    if (formData.password.length < 8) {
      setErr(t('passwordMin8'));
      return;
    }

    // Agency-specific validation
    if (selectedRole === "agency") {
      if (!formData.agencyName) {
        setErr(t('agencyName') + " required");
        return;
      }
      if (!formData.promoCode) {
        setErr(t('promoCode') + " required");
        return;
      }
      if (!formData.agentCount || formData.agentCount < 1) {
        setErr(t('numberOfAgents') + " required");
        return;
      }
    }

    // Agent-specific validation
    if (selectedRole === "agent" && !formData.invitationToken) {
      setErr(t('invitationToken') + " required");
      return;
    }

    try {
      setMsg(t('loading'));

      const BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";
      const res = await fetch(`${BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: selectedRole,
          agencyName: formData.agencyName,
          agentCount: parseInt(formData.agentCount),
          promoCode: formData.promoCode,
          invitationToken: formData.invitationToken
        })
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || t('signUp') + " failed");
      }

      setToken(data.token);
      setMsg(t('languageSaved'));
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);

    } catch (e) {
      setMsg("");
      setErr(typeof e?.message === "string" ? e.message : t('signUp') + " failed");
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4"
      style={{
        background: "linear-gradient(120deg, #1a3150 0%, #20344A 40%, #007cf0 100%)",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        className="bg-white p-8 rounded-3xl shadow-2xl max-w-lg w-full border-t-8"
        style={{
          borderTopColor: "#FFB800",
          borderTopWidth: "8px",
        }}
      >
        {/* Logo and Header */}
        <div className="flex flex-col items-center pb-6">
          <img
            src="/logo.png"
            alt="Pro IRP Logo"
            className="w-24 h-24 mb-3 rounded-full shadow bg-white"
            style={{ objectFit: "contain" }}
          />
          <h1
            className="text-3xl font-extrabold tracking-tight font-[Inter] mb-1"
            style={{ color: "#172A3A" }}
          >
            Pro <span style={{ color: "#FFB800" }}>IRP</span>
          </h1>
          <div
            className="text-lg"
            style={{
              color: "#20344A",
              fontFamily: "Inter, sans-serif",
              fontWeight: 500,
            }}
          >
            {t('createYourAccount')}
          </div>
        </div>

        {/* Role Selection (only if not coming via invite link) */}
        {!inviteToken && (
          <div className="mb-6">
            <div className="text-sm font-semibold mb-2" style={{ color: "#172A3A" }}>
              {t('signingUpAs')}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole("agency")}
                className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${
                  selectedRole === "agency"
                    ? "border-[#FFB800] bg-yellow-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <Building2 size={28} className={selectedRole === "agency" ? "text-[#FFB800]" : "text-gray-600"} />
                <span className="font-bold text-sm">{t('agency')}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("agent")}
                className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${
                  selectedRole === "agent"
                    ? "border-[#FFB800] bg-yellow-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <Users size={28} className={selectedRole === "agent" ? "text-[#FFB800]" : "text-gray-600"} />
                <span className="font-bold text-sm">{t('agentRole')}</span>
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">
              {selectedRole === "agency" ? t('manageAgency') : t('joinAgencyTeam')}
            </div>
          </div>
        )}

        {/* Messages */}
        {msg && <div className="text-center text-blue-600 mb-3 font-medium">{msg}</div>}
        {err && <div className="text-center text-red-600 mb-3 text-sm font-medium bg-red-50 p-2 rounded">{err}</div>}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Agency Form */}
          {selectedRole === "agency" && (
            <>
              <input
                className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FFB800]"
                type="text"
                name="agencyName"
                placeholder={t('agencyName') + " *"}
                value={formData.agencyName}
                onChange={handleChange}
                required
              />
              <input
                className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FFB800]"
                type="text"
                name="name"
                placeholder={t('yourName')}
                value={formData.name}
                onChange={handleChange}
              />
              <input
                className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FFB800]"
                type="email"
                name="email"
                placeholder={t('emailLabel') + " *"}
                value={formData.email}
                onChange={handleChange}
                autoComplete="username"
                required
              />
              <input
                className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FFB800]"
                type="number"
                name="agentCount"
                placeholder={t('numberOfAgents') + " *"}
                value={formData.agentCount}
                onChange={handleChange}
                min="1"
                required
              />
              <input
                className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FFB800]"
                type="text"
                name="promoCode"
                placeholder={t('promoCode') + " *"}
                value={formData.promoCode}
                onChange={handleChange}
                required
              />
              <input
                className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FFB800]"
                type="password"
                name="password"
                placeholder={t('passwordMin8') + " *"}
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
              <input
                className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FFB800]"
                type="password"
                name="confirmPassword"
                placeholder={t('confirmPassword') + " *"}
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </>
          )}

          {/* Agent Form */}
          {selectedRole === "agent" && (
            <>
              {inviteToken && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
                  <div className="text-sm text-blue-800 font-medium">
                    {t('invitedToJoin')}
                  </div>
                </div>
              )}
              <input
                className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FFB800]"
                type="text"
                name="name"
                placeholder={t('yourName')}
                value={formData.name}
                onChange={handleChange}
              />
              <input
                className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FFB800]"
                type="email"
                name="email"
                placeholder={t('emailMustMatch') + " *"}
                value={formData.email}
                onChange={handleChange}
                autoComplete="username"
                required
              />
              <input
                className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FFB800]"
                type="text"
                name="invitationToken"
                placeholder={t('invitationToken') + " *"}
                value={formData.invitationToken}
                onChange={handleChange}
                required
              />
              <input
                className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FFB800]"
                type="password"
                name="password"
                placeholder={t('passwordMin8') + " *"}
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
              <input
                className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FFB800]"
                type="password"
                name="confirmPassword"
                placeholder={t('confirmPassword') + " *"}
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </>
          )}

          {/* Submit Button */}
          <button
            className="w-full py-3 rounded-xl font-bold text-lg shadow-lg mt-4 transition hover:opacity-90"
            style={{
              background: "#172A3A",
              color: "#FFB800",
            }}
            type="submit"
          >
            {selectedRole === "agency" ? t('createAgencyAccount') : t('acceptInvitation')}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 space-y-2">
          <div className="text-center">
            <Link to="/" className="text-sm hover:underline font-semibold" style={{ color: "#172A3A" }}>
              {t('alreadyHaveAccount')} {t('logIn')}
            </Link>
          </div>
          {selectedRole === "agency" && (
            <div className="text-center">
              <div className="text-xs text-gray-500">
                {t('needPromoCode')}{" "}
                <a href="mailto:support@proirp.com" className="text-blue-600 hover:underline">
                  support@proirp.com
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FMO Notice */}
      <div className="mt-4 max-w-lg w-full">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Mail size={18} className="text-white" />
            <span className="text-white font-semibold">{t('fmoPartnership')}</span>
          </div>
          <div className="text-sm text-white/90">
            {t('fmoContact')}{" "}
            <a href="mailto:partnerships@proirp.com" className="text-[#FFB800] hover:underline font-semibold">
              partnerships@proirp.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
