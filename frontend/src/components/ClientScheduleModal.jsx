// /frontend/src/components/ClientScheduleModal.jsx
import React, { useState } from "react";

const ClientScheduleModal = ({ onClose, client }) => {
  const [type, setType] = useState("call");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleSchedule = e => {
    e.preventDefault();
    alert(`Scheduled ${type === "call" ? "call" : "appointment"} with ${client.name} for ${date}.\nNotes: ${notes}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-0 flex flex-col">
        <div className="flex items-center justify-between border-b p-4">
          <span className="font-bold text-lg">📅 Schedule {type === "call" ? "Call" : "Appointment"}</span>
          <button className="text-xl" onClick={onClose}>✖️</button>
        </div>
        <form className="p-6" onSubmit={handleSchedule}>
          <label className="block text-sm font-bold mb-1 text-[#20344A]">Type</label>
          <select
            className="w-full border p-2 rounded mb-4"
            value={type}
            onChange={e => setType(e.target.value)}
          >
            <option value="call">📞 Phone Call</option>
            <option value="appointment">📅 Appointment</option>
          </select>
          <label className="block text-sm font-bold mb-1 text-[#20344A]">Date & Time</label>
          <input
            className="w-full border p-2 rounded mb-4"
            type="datetime-local"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
          <label className="block text-sm font-bold mb-1 text-[#20344A]">Notes</label>
          <textarea
            className="w-full border p-2 rounded mb-6"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Purpose, details..."
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded-xl text-gray-700 font-bold hover:bg-gray-300 transition">Cancel</button>
            <button type="submit" className="bg-[#FFB800] px-5 py-2 rounded-xl text-[#172A3A] font-bold hover:bg-yellow-400 transition">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientScheduleModal;
