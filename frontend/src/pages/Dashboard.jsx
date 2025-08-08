// /frontend/src/pages/Dashboard.jsx

import React from "react";
import DashboardHeader from "../components/DashboardHeader";
import MetricCards from "../components/MetricCards";
import RetentionCharts from "../components/RetentionCharts";
import TaskList from "../components/TaskList";
import ActivityFeed from "../components/ActivityFeed";
import RiskList from "../components/RiskList";
import AlertsWidget from "../components/AlertsWidget";
import QuickLookup from "../components/QuickLookup";
import SectionLinks from "../components/SectionLinks";

// --- Calendar imports ---
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, isToday } from "date-fns";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";

// Calendar setup
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
  {
    id: 3,
    title: "Follow Up: Cherie Fluegel",
    start: new Date(new Date().setHours(15, 0, 0, 0)),
    end: new Date(new Date().setHours(16, 0, 0, 0)),
    type: "FollowUp",
  },
];

function eventPropGetter(event) {
  let colorClass = COLORS[event.id % COLORS.length];
  return {
    className: `rounded-xl font-bold px-2 ${colorClass}`,
    style: { border: "none" },
  };
}

// Only show events that are today
function getTodayEvents(events) {
  return events.filter(ev => isToday(ev.start));
}

const Dashboard = () => (
  <div
    className="min-h-screen bg-gray-100 py-8 px-4"
    style={{ fontFamily: "Inter, sans-serif" }}
  >
    <DashboardHeader />
    <div className="max-w-7xl mx-auto space-y-8">
      <MetricCards />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main column */}
        <div className="md:col-span-2 space-y-8">
          <RetentionCharts />
          <TaskList />
          <ActivityFeed />
        </div>
        {/* Sidebar widgets */}
        <div className="space-y-8">
          {/* --- Today's Calendar Widget --- */}
          <div className="bg-white rounded-2xl shadow-md p-4">
            <div className="font-bold text-[#172A3A] text-lg mb-2 flex items-center gap-2">
              <span role="img" aria-label="calendar">📅</span>
              Today's Calendar
            </div>
            <BigCalendar
              localizer={localizer}
              events={getTodayEvents(DEMO_EVENTS)}
              startAccessor="start"
              endAccessor="end"
              defaultView={Views.DAY}
              views={['day']}
              style={{ height: 260, fontSize: "0.98rem" }}
              toolbar={false}
              eventPropGetter={eventPropGetter}
              min={new Date(new Date().setHours(6, 0, 0, 0))}
              max={new Date(new Date().setHours(20, 0, 0, 0))}
            />
          </div>
          {/* --- End Calendar Widget --- */}

          {/* --- At Risk Clients (RiskList) --- */}
          <RiskList />
          {/* --- End At Risk Clients --- */}

          <AlertsWidget />
          <QuickLookup />
          <SectionLinks />
        </div>
      </div>
    </div>
  </div>
);

export default Dashboard;
