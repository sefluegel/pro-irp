// /frontend/src/components/TakeActionMenu.jsx
import React, { useState } from "react";

const TakeActionMenu = ({ smsUnread, emailUnread, onSms, onEmail, onCall, onSchedule }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] px-8 py-4 rounded-2xl font-extrabold text-lg shadow-lg flex items-center gap-2 mb-2 transition"
        onClick={() => setOpen(v => !v)}
        style={{ fontSize: "1.2rem" }}
      >
        ⚡ Take Action
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl border z-40 p-1 flex flex-col">
          <button onClick={onSms} className="flex items-center gap-2 p-3 rounded-xl text-lg hover:bg-blue-50 transition font-semibold">
            📲 Send SMS
            {smsUnread > 0 && (
              <span className="ml-1 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">{smsUnread}</span>
            )}
          </button>
          <button onClick={onEmail} className="flex items-center gap-2 p-3 rounded-xl text-lg hover:bg-blue-50 transition font-semibold">
            📧 Send Email
            {emailUnread > 0 && (
              <span className="ml-1 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">{emailUnread}</span>
            )}
          </button>
          <button onClick={onCall} className="flex items-center gap-2 p-3 rounded-xl text-lg hover:bg-blue-50 transition font-semibold">
            📞 Call
          </button>
          <button onClick={onSchedule} className="flex items-center gap-2 p-3 rounded-xl text-lg hover:bg-blue-50 transition font-semibold">
            📅 Schedule Appointment
          </button>
        </div>
      )}
    </div>
  );
};

export default TakeActionMenu;
