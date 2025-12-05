import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, UserMinus, PlusCircle, Calendar } from "lucide-react";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";

// Fetch real dashboard metrics from backend
async function fetchMetrics() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/metrics/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch metrics");
  const json = await res.json();
  return json.data;
}

const MetricCards = () => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchMetrics();
        setMetrics(data);
      } catch (err) {
        console.error("Failed to load metrics:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl shadow p-5 flex flex-col items-center text-center border-t-4 border-gray-300 animate-pulse">
            <div className="w-8 h-8 bg-gray-200 rounded mb-2"></div>
            <div className="w-16 h-6 bg-gray-200 rounded mb-1"></div>
            <div className="w-20 h-4 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      icon: <TrendingUp size={32} className="text-[#172A3A]" />,
      label: t('retentionRate'),
      value: metrics?.retentionRate || "0%",
    },
    {
      icon: <UserMinus size={32} className="text-red-500" />,
      label: t('churnedClients'),
      value: metrics?.churned ? `${metrics.churned} (${t('days30')})` : `0 (${t('days30')})`,
    },
    {
      icon: <PlusCircle size={32} className="text-green-500" />,
      label: t('newClients'),
      value: metrics?.newClients ? `${metrics.newClients} (${t('thisMonth')})` : `0 (${t('thisMonth')})`,
    },
    {
      icon: <Calendar size={32} className="text-[#007cf0]" />,
      label: t('tasksDue'),
      value: metrics?.tasksDue?.toString() || "0",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {cards.map(({ icon, label, value }) => (
        <div
          key={label}
          className="bg-white rounded-2xl shadow p-5 flex flex-col items-center text-center border-t-4"
          style={{ borderTopColor: label === "Retention Rate" ? "#FFB800" : "#20344A" }}
        >
          <div className="mb-2">{icon}</div>
          <div className="text-2xl font-bold text-[#172A3A]">{value}</div>
          <div className="text-sm text-[#20344A]">{label}</div>
        </div>
      ))}
    </div>
  );
};

export default MetricCards;
