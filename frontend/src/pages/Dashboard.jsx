import React from "react";
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from "react-big-calendar";
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
];

const DEMO_EVENTS = [
  {
    id: 1,
    title: "Annual Review: Jane Doe",
    start: new Date(),
    end: new Date(new Date().getTime() + 60 * 60 * 1000),
    type: "Review",
  },
  {
    id: 2,
    title: "Enrollment: Bob Smith",
    start: new Date(new Date().setDate(new Date().getDate() + 1)),
    end: new Date(new Date().setDate(new Date().getDate() + 1)),
    type: "Enrollment",
  },
];

export default function WeeklyCalendar() {
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
    <div className="bg-white rounded-2xl shadow-md p-3 mb-8">
      <div className="font-bold text-[#172A3A] text-lg mb-2 flex items-center gap-2">
        <span role="img" aria-label="calendar">📅</span>
        This Week’s Calendar
      </div>
      <BigCalendar
        localizer={localizer}
        events={DEMO_EVENTS}
        startAccessor="start"
        endAccessor="end"
        defaultView={Views.WEEK}
        views={['week']}
        style={{ height: 320, fontSize: "0.98rem" }}
        toolbar={false}
        eventPropGetter={eventPropGetter}
      />
    </div>
  );
}
