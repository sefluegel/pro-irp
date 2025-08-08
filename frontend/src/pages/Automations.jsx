import React from "react";

const Automations = () => (
  <div
    className="relative min-h-screen flex flex-col items-center justify-center font-[Inter]"
    style={{
      background: "#F8FAFC",
      overflow: "hidden",
    }}
  >
    {/* Giant faint smiley face */}
    <div
      aria-hidden
      className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none"
      style={{
        fontSize: "28vw",
        color: "#FFEFC6",
        opacity: 0.35,
        userSelect: "none",
        lineHeight: 1,
      }}
    >
      <span role="img" aria-label="Smiley">😊</span>
    </div>

    {/* Foreground content */}
    <div className="relative z-10 w-full max-w-3xl mx-auto p-10 text-center">
      <h1 className="text-4xl font-extrabold text-[#172A3A] mb-4 drop-shadow">
        Automations
      </h1>
      <p className="text-lg text-gray-600 mb-10">
        Build time-saving automations for outreach, reviews, follow-ups, and more.<br/>
        <span className="text-[#FFB800] font-semibold">Automations are your smile-inducing assistant!</span>
      </p>
      {/* Example: Add automation UI below */}
      <div className="bg-white rounded-2xl shadow p-8 space-y-6">
        <div className="font-bold text-xl text-[#172A3A] mb-3">
          Coming Soon!
        </div>
        <div className="text-gray-500 text-base">
          You’ll be able to create smart triggers to automatically send emails, texts, assign tasks, and much more.
        </div>
      </div>
    </div>
  </div>
);

export default Automations;
