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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 via-blue-300 to-white font-[Inter]">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full">
        {/* Modern Branding Header */}
        <div className="flex flex-col items-center pt-4 pb-6">
          <img
            src="/logo.png"
            alt="Pro IRP Logo"
            className="w-24 h-24 mb-4 rounded-full shadow"
            style={{ objectFit: "contain", background: "#fff" }}
          />
          <h1 className="text-4xl font-extrabold text-blue-700 tracking-tight font-[Inter]">
            Pro <span className="text-blue-400">IRP</span>
          </h1>
          <div className="mt-1 text-lg text-gray-500 font-medium tracking-wide">
            Next Generation Insurance Retention
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          {msg && <div className="text-center text-red-500 mb-3">{msg}</div>}
          <input
            className="w-full p-3 rounded border mb-4 focus:outline-blue-500"
            type="email"
            placeholder="Email"
            value={email}
            autoComplete="username"
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full p-3 rounded border mb-4 focus:outline-blue-500"
            type="password"
            placeholder="Password"
            value={pw}
            autoComplete="current-password"
            onChange={e => setPw(e.target.value)}
            required
          />
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-semibold text-lg shadow mt-2 transition"
            type="submit"
          >
            Log In
          </button>
        </form>
        <div className="flex justify-between mt-5 text-sm text-blue-600">
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
