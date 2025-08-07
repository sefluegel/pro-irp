// /frontend/src/pages/Dashboard.jsx
import React from "react";
import DashboardHeader from "../components/DashboardHeader";
import MetricCards from "../components/MetricCards";
import ActionBar from "../components/ActionBar";
import RetentionCharts from "../components/RetentionCharts";
import TaskList from "../components/TaskList";
import ActivityFeed from "../components/ActivityFeed";
import RiskList from "../components/RiskList";
import AlertsWidget from "../components/AlertsWidget";
import QuickLookup from "../components/QuickLookup";
import SectionLinks from "../components/SectionLinks";

// ---- Remove "Broadcast" and "Policy Review" from ActionBar and/or SectionLinks if needed ----

const Dashboard = () => (
  <div className="min-h-screen bg-gray-100 py-8 px-4" style={{ fontFamily: "Inter, sans-serif" }}>
    <DashboardHeader />
    <div className="max-w-7xl mx-auto space-y-8">
      <MetricCards />
      {/* If your ActionBar or SectionLinks contained "Broadcast" or "Policy Review", 
          make sure those buttons/links are removed from those components too */}
      <ActionBar />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <RetentionCharts />
          <TaskList />
          <ActivityFeed />
        </div>
        <div className="space-y-8">
          <RiskList />
          <AlertsWidget />
          <QuickLookup />
          <SectionLinks />
        </div>
      </div>
    </div>
  </div>
);

export default Dashboard;
