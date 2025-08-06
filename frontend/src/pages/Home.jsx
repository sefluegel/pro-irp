import React from 'react';

const Home = () => (
  <div
    className="flex flex-col items-center justify-center min-h-screen"
    style={{
      background: "linear-gradient(135deg, #376FDB 0%, #8FD0FF 100%)",
      fontFamily: "Inter, sans-serif",
    }}
  >
    <div
      className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-xl flex flex-col items-center"
      style={{ borderTop: "8px solid #FFB800" }}
    >
      <img
        src="/logo.png"
        alt="Pro IRP Logo"
        className="w-28 h-28 mb-4 rounded-full shadow bg-white"
        style={{ objectFit: "contain" }}
      />
      <h1
        className="text-4xl font-extrabold tracking-tight mb-2"
        style={{ color: "#172A3A" }}
      >
        Welcome to <span style={{ color: "#FFB800" }}>Pro IRP</span>
      </h1>
      <p
        className="text-lg mb-6 text-center"
        style={{ color: "#20344A", fontWeight: 500 }}
      >
        This is your home page. <br />
        <span style={{ color: "#FFB800" }}>
          Insurance Retention Partner for the Next Generation.
        </span>
      </p>
      <div className="w-full flex flex-col sm:flex-row gap-4 justify-center mt-4">
        <a
          href="/dashboard"
          className="flex-1 text-center py-3 rounded-xl font-bold text-lg shadow transition"
          style={{
            background: "#172A3A",
            color: "#FFB800",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Go to Dashboard
        </a>
        <a
          href="/signup"
          className="flex-1 text-center py-3 rounded-xl font-bold text-lg shadow transition"
          style={{
            background: "#FFB800",
            color: "#172A3A",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Create Account
        </a>
      </div>
    </div>
  </div>
);

export default Home;
