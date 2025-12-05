import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";

async function fetchAtRiskClients() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/metrics/at-risk-clients?limit=5&minScore=70`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch at-risk clients");
  const json = await res.json();
  return json.data || [];
}

const riskColors = {
  High: "bg-red-600",
  Medium: "bg-yellow-500",
  Low: "bg-green-500",
};

function getRiskReason(client, t) {
  if (!client.lastContact) return t('noContactRecorded');

  const lastContactDate = new Date(client.lastContact);
  const now = new Date();
  const daysSinceContact = Math.floor((now - lastContactDate) / (1000 * 60 * 60 * 24));

  if (daysSinceContact > 180) return t('noContactInMonths', { months: Math.floor(daysSinceContact / 30) });
  if (daysSinceContact > 90) return t('noContactIn90Days');
  if (daysSinceContact > 30) return t('noContactInDays', { days: daysSinceContact });

  return t('highRiskScore');
}

const RiskList = () => {
  const { t } = useTranslation();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAtRiskClients();
        setClients(data);
      } catch (err) {
        console.error("Failed to load at-risk clients:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-6 border-t-4" style={{ borderTopColor: "#FFB800" }}>
        <div className="text-lg font-semibold text-[#172A3A] mb-4">{t('atRiskClients')}</div>
        <div className="animate-pulse space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 border-t-4" style={{ borderTopColor: "#FFB800" }}>
      <div className="text-lg font-semibold text-[#172A3A] mb-4">{t('atRiskClients')}</div>
      {clients.length === 0 ? (
        <div className="text-gray-500 text-sm py-4">{t('noHighRiskClients')}</div>
      ) : (
        <ul className="space-y-4">
          {clients.map((r) => (
            <li key={r.id} className="flex flex-col">
              <span className="font-bold">{r.name || t('unnamedClient')}</span>
              <span className={`w-fit px-2 py-1 text-xs rounded text-white font-bold mt-1 ${riskColors[r.riskLevel]}`}>
                {r.riskLevel} {t('risk')} ({r.riskScore})
              </span>
              <span className="text-xs text-gray-500">{getRiskReason(r, t)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RiskList;
