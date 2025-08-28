import React from "react";
import Logo from "../components/Logo";
import { Link } from "react-router-dom";

const ForgotPassword = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 via-blue-300 to-white">
    <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
      <Logo size={60} />
      <h1 className="text-2xl font-extrabold text-center mb-6 text-blue-700 tracking-wide">
        Reset your password
      </h1>
      <form>
        <input
          className="w-full p-3 rounded border mb-4 focus:outline-blue-500"
          type="email"
          placeholder="Enter your email"
          required
        />
        <button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-semibold text-lg shadow mt-2 transition"
          type="submit"
        >
          Send reset link
        </button>
      </form>
      <div className="flex justify-between mt-5 text-sm text-blue-600">
        <Link to="/login" className="hover:underline font-semibold">
          Back to log in
        </Link>
      </div>
    </div>
  </div>
);

export default ForgotPassword;
