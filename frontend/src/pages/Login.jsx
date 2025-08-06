import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setMsg("");
    // Fake success for demo
    if (!email || !pw) {
      setMsg("Enter email and password");
      return;
    }
    setMsg("Logging in...");
    setTimeout(() => {
      setMsg("");
      navigate("/dashboard");
    }, 800);
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen"
      style={{
        background: "linear-gradient(120deg, #1a3150 0%, #20344A 40%, #007cf0 100%)",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full border-t-8"
        style={{
          borderTopColor: "#FFB800",
          borderTopWidth: "8px",
        }}
      >
        {/* Modern Branding Header */}
        <div className="flex flex-col items-center pt-2 pb-6">
          <img
            src="/logo.png"
            alt="Pro IRP Logo"
            className="w-28 h-28 mb-4 rounded-full shadow bg-white"
            style={{ objectFit: "contain" }}
          />
          <h1
            className="text-4xl font-extrabold tracking-tight font-[Inter]"
            style={{ color: "#172A3A" }}
          >
            Pro <span style={{ color: "#FFB800" }}>IRP</span>
          </h1>
          <div
            className="mt-1 text-lg"
            style={{
              color: "#20344A",
              fontFamily: "Inter, sans-serif",
              fontWeight: 500,
            }}
          >
            Next Generation Insurance Retention
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          {msg && <div className="text-center text-red-500 mb-3">{msg}</div>}
          <input
            className="w-full p-3 rounded border mb-4 focus:outline-[#172A3A] font-[Inter]"
            type="email"
            placeholder="Email"
            value={email}
            autoComplete="username"
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full p-3 rounded border mb-4 focus:outline-[#172A3A] font-[Inter]"
            type="password"
            placeholder="Password"
            value={pw}
            autoComplete="current-password"
            onChange={e => setPw(e.target.value)}
            required
          />
          <button
            className="w-full py-3 rounded font-semibold text-lg shadow mt-2 transition"
            style={{
              background: "#172A3A",
              color: "#FFB800"
            }}
            type="submit"
          >
            Log In
          </button>
        </form>
        <div className="flex justify-between mt-5 text-sm" style={{ color: "#172A3A" }}>
          <Link to="/signup" className="hover:underline font-semibold">
            Sign up
          </Link>
          <Link to="/forgot" className="hover:underline font-semibold">
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
