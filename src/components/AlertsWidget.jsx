import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";

async function fetchAlerts() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/metrics/alerts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch alerts");
  const json = await res.json();
  return json.data || [];
}

const alertColors = {
  warning: "bg-yellow-100 text-yellow-800",
  info: "bg-blue-100 text-blue-800",
};

const AlertsWidget = () => {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAlerts();
        setAlerts(data);
      } catch (err) {
        console.error("Failed to load alerts:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-6 border-t-4" style={{ borderTopColor: "#007cf0" }}>
        <div className="text-lg font-semibold text-[#172A3A] mb-4">{t('alerts')}</div>
        <div className="animate-pulse space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-10 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 border-t-4" style={{ borderTopColor: "#007cf0" }}>
      <div className="text-lg font-semibold text-[#172A3A] mb-4">{t('alerts')}</div>
      {alerts.length === 0 ? (
        <div className="text-gray-500 text-sm py-4">{t('noAlerts')}</div>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a, i) => (
            <li key={i} className={`px-3 py-2 rounded ${alertColors[a.type]}`}>
              {a.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AlertsWidget;
