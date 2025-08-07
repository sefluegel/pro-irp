// /frontend/src/pages/Dashboard.jsx
import React, { useState } from "react";
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
import ClientForm from "../components/ClientForm";

const Dashboard = ({ clients = [], onAddClient, onUpdateClient }) => {
  const [showForm, setShowForm] = useState(false);

  // Save new client
  const handleSave = (client) => {
    if (onAddClient) onAddClient(client);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4" style={{ fontFamily: "Inter, sans-serif" }}>
      <DashboardHeader />
      <div className="max-w-7xl mx-auto space-y-8">
        <MetricCards />
        <ActionBar onAddClient={() => setShowForm(true)} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <RetentionCharts />
            <TaskList />
            <ActivityFeed
              clients={clients}
              onClientClick={id => window.location.assign(`/clients/${id}`)}
            />
          </div>
          <div className="space-y-8">
            <RiskList clients={clients} onClientClick={id => window.location.assign(`/clients/${id}`)} />
            <AlertsWidget />
            <QuickLookup clients={clients} onClientClick={id => window.location.assign(`/clients/${id}`)} />
            <SectionLinks onAddClient={() => setShowForm(true)} />
          </div>
        </div>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl min-w-[340px] max-w-xl w-full relative">
            <ClientForm
              onSave={handleSave}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
