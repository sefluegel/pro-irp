import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";

async function fetchActivity() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/metrics/recent-activity?limit=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch activity");
  const json = await res.json();
  return json.data || [];
}

function formatTimeAgo(dateString, t) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('justNow');
  if (diffMins < 60) return t('minutesAgo', { minutes: diffMins });
  if (diffHours < 24) return t('hoursAgo', { hours: diffHours });
  if (diffDays < 7) return t('daysAgo', { days: diffDays });
  return date.toLocaleDateString();
}

function formatActivityDescription(activity, t) {
  const action = activity.direction === 'outbound' ? t('sent') : t('received');
  const typeLabel = {
    sms: t('sms'),
    email: t('email'),
    call: t('call'),
    note: t('notes'),
    appointment: 'appointment',
  }[activity.type] || activity.type;

  return `${action} ${typeLabel}: ${activity.clientName}`;
}

const ActivityFeed = () => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchActivity();
        setActivities(data);
      } catch (err) {
        console.error("Failed to load activity:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-6 border-t-4" style={{ borderTopColor: "#FFB800" }}>
        <div className="text-lg font-semibold text-[#172A3A] mb-4">{t('recentActivityTitle')}</div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 border-t-4" style={{ borderTopColor: "#FFB800" }}>
      <div className="text-lg font-semibold text-[#172A3A] mb-4">{t('recentActivityTitle')}</div>
      {activities.length === 0 ? (
        <div className="text-gray-500 text-sm py-4">{t('noRecentActivity')}</div>
      ) : (
        <ul className="divide-y">
          {activities.map((a) => (
            <li key={a.id} className="py-3 flex justify-between text-sm">
              <span>{formatActivityDescription(a, t)}</span>
              <span className="text-gray-400">{formatTimeAgo(a.createdAt, t)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ActivityFeed;
