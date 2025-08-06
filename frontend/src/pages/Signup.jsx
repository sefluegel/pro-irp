import React, { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");

  const handleSubmit = async e => {
    e.preventDefault();
    setMsg("");
    setMsg("Signup not active in demo mode.");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 via-blue-300 to-white">
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
        <Logo size={70} />
        <h1 className="text-2xl font-extrabold text-center mb-6 text-blue-700 tracking-wide">
          Create Your Account
        </h1>
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
            autoComplete="new-password"
            onChange={e => setPw(e.target.value)}
            required
          />
          <button
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded font-semibold text-lg shadow mt-2 transition"
            type="submit"
          >
            Sign Up
          </button>
        </form>
        <div className="flex justify-between mt-5 text-sm text-blue-600">
          <Link to="/login" className="hover:underline font-semibold">
            Already have an account? Log in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
