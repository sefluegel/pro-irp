import React, { useState } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

const COLORS = [
  "bg-blue-200 text-blue-800",
  "bg-yellow-100 text-yellow-800",
  "bg-purple-100 text-purple-800",
  "bg-green-100 text-green-800",
  "bg-pink-100 text-pink-800",
];

const INITIAL_EVENTS = [
  {
    id: 1,
    title: "Annual Policy Review: Jane Doe",
    start: new Date(),
    end: new Date(new Date().getTime() + 60 * 60 * 1000),
    type: "Review",
  },
  {
    id: 2,
    title: "Medicare Enrollment: Bob Smith",
    start: new Date(new Date().setDate(new Date().getDate() + 1)),
    end: new Date(new Date().setDate(new Date().getDate() + 1)),
    type: "Enrollment",
  },
];

export default function Calendar() {
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    date: "",
    time: "",
    type: "Meeting",
    duration: 60,
  });

  // Add new event
  function handleSelectSlot({ start }) {
    setForm({
      ...form,
      date: format(start, "yyyy-MM-dd"),
      time: format(start, "HH:mm"),
    });
    setSelected(null);
    setModalOpen(true);
  }

  // Edit event
  function handleSelectEvent(event) {
    setForm({
      title: event.title,
      date: format(event.start, "yyyy-MM-dd"),
      time: format(event.start, "HH:mm"),
      type: event.type,
      duration: (event.end - event.start) / (60 * 1000),
    });
    setSelected(event);
    setModalOpen(true);
  }

  // Save event (add/edit)
  function handleSave(e) {
    e.preventDefault();
    const start = new Date(`${form.date}T${form.time}`);
    const end = new Date(start.getTime() + form.duration * 60000);
    if (selected) {
      // Edit existing
      setEvents(events.map(ev => ev.id === selected.id
        ? { ...selected, title: form.title, start, end, type: form.type }
        : ev
      ));
    } else {
      // Add new
      setEvents([
        ...events,
        {
          id: Date.now(),
          title: form.title,
          start,
          end,
          type: form.type,
        },
      ]);
    }
    setModalOpen(false);
    setForm({ title: "", date: "", time: "", type: "Meeting", duration: 60 });
    setSelected(null);
  }

  // Delete event
  function handleDelete() {
    setEvents(events.filter(ev => ev.id !== selected.id));
    setModalOpen(false);
    setSelected(null);
  }

  // Branded event style
  function eventPropGetter(event) {
    let colorClass = COLORS[event.id % COLORS.length];
    return {
      className: `rounded-xl font-bold px-2 ${colorClass}`,
      style: {
        border: "none",
      },
    };
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 font-[Inter]">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-[#172A3A]">📅 Calendar</h1>
          <p className="text-gray-500">Track reviews, appointments, enrollments, and more.</p>
        </div>
        <button
          onClick={() => { setSelected(null); setModalOpen(true); }}
          className="bg-[#FFB800] text-[#172A3A] font-bold px-6 py-2 rounded-xl shadow hover:bg-yellow-400 transition mt-3 md:mt-0"
        >
          + Add Event
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-md p-4">
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          selectable
          style={{ height: 560 }}
          popup
          eventPropGetter={eventPropGetter}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
        />
      </div>
      {/* Modal for Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-[360px] max-w-[95vw] p-7 relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-black"
              onClick={() => setModalOpen(false)}
            >✖</button>
            <h2 className="text-xl font-bold text-[#172A3A] mb-4">
              {selected ? "Edit Event" : "Add Event"}
            </h2>
            <form className="space-y-3" onSubmit={handleSave}>
              <input
                className="w-full px-3 py-2 border rounded text-sm"
                placeholder="Title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  className="flex-1 px-3 py-2 border rounded text-sm"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  required
                />
                <input
                  type="time"
                  className="flex-1 px-3 py-2 border rounded text-sm"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  required
                />
              </div>
              <select
                className="w-full px-3 py-2 border rounded text-sm"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="Meeting">Meeting</option>
                <option value="Review">Policy Review</option>
                <option value="Enrollment">Enrollment</option>
                <option value="Task">Task</option>
                <option value="Personal">Personal</option>
              </select>
              <div>
                <label className="text-sm font-medium">Duration (minutes):</label>
                <input
                  type="number"
                  min={15}
                  step={15}
                  className="w-20 px-2 py-1 border rounded ml-2"
                  value={form.duration}
                  onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                  required
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  className="flex-1 bg-[#FFB800] text-[#172A3A] font-bold py-2 rounded-xl shadow hover:bg-yellow-400 transition"
                  type="submit"
                >{selected ? "Save Changes" : "Add Event"}</button>
                {selected && (
                  <button
                    className="flex-1 bg-red-100 text-red-600 font-bold py-2 rounded-xl shadow hover:bg-red-200 transition"
                    type="button"
                    onClick={handleDelete}
                  >Delete</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
