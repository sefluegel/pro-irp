// src/components/RetentionCharts.jsx
// Real-time retention trend and churn breakdown charts

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { RefreshCw, TrendingUp, PieChart as PieChartIcon } from "lucide-react";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";
const PIE_COLORS = ["#2E5C99", "#5AA0E6", "#78B0F0", "#A2D2FF", "#C5E1FF"];

async function fetchRetentionTrend() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/metrics/retention-trend`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch retention trend");
  return await res.json();
}

async function fetchChurnBreakdown() {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE}/metrics/churn-breakdown`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch churn breakdown");
  return await res.json();
}

export default function RetentionCharts() {
  const { t } = useTranslation();
  const [trendData, setTrendData] = useState([]);
  const [churnData, setChurnData] = useState([]);
  const [loadingTrend, setLoadingTrend] = useState(true);
  const [loadingChurn, setLoadingChurn] = useState(true);
  const [trendEmpty, setTrendEmpty] = useState(false);
  const [churnEmpty, setChurnEmpty] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    // Load both in parallel
    await Promise.all([loadTrendData(), loadChurnData()]);
  }

  async function loadTrendData() {
    try {
      setLoadingTrend(true);
      const result = await fetchRetentionTrend();
      setTrendData(result.data || []);
      setTrendEmpty(result.isEmpty || false);
    } catch (err) {
      console.error("Failed to load retention trend:", err);
      setTrendData([]);
      setTrendEmpty(true);
    } finally {
      setLoadingTrend(false);
    }
  }

  async function loadChurnData() {
    try {
      setLoadingChurn(true);
      const result = await fetchChurnBreakdown();
      setChurnData(result.data || []);
      setChurnEmpty(result.isEmpty || false);
    } catch (err) {
      console.error("Failed to load churn breakdown:", err);
      setChurnData([]);
      setChurnEmpty(true);
    } finally {
      setLoadingChurn(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  // Custom tooltip for retention chart
  const RetentionTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
          <p className="font-semibold text-gray-800">{label} {data.year}</p>
          <p className="text-blue-600">Retention: {data.retention}%</p>
          <p className="text-gray-600 text-sm">
            {data.activeClients} / {data.totalClients} clients active
          </p>
          {data.churned > 0 && (
            <p className="text-red-500 text-sm">{data.churned} churned</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for churn pie chart
  const ChurnTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
          <p className="font-semibold text-gray-800">{data.name}</p>
          <p className="text-blue-600">{data.value}%</p>
          {data.count !== undefined && (
            <p className="text-gray-600 text-sm">{data.count} clients</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Retention Trend (Line) */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-600" />
            <h3 className="font-bold text-[#172A3A] text-lg">{t('retentionTrend')}</h3>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-gray-100 rounded-full transition"
            title="Refresh data"
          >
            <RefreshCw size={16} className={`text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingTrend ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-48 h-32 bg-gray-200 rounded mb-2"></div>
              <div className="w-32 h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : trendEmpty ? (
          <div className="h-64 flex items-center justify-center text-center">
            <div className="text-gray-500">
              <TrendingUp size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="font-medium">No retention data yet</p>
              <p className="text-sm mt-1">Data will appear as you add and manage clients</p>
            </div>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="#edf2f7" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<RetentionTooltip />} />
                <Line
                  type="monotone"
                  dataKey="retention"
                  stroke="#2E5C99"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#2E5C99' }}
                  activeDot={{ r: 6, fill: '#2E5C99' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {!loadingTrend && !trendEmpty && trendData.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600 border-t pt-3">
            <span>Last 12 months</span>
            <span className="font-semibold text-blue-600">
              Current: {trendData[trendData.length - 1]?.retention || 0}%
            </span>
          </div>
        )}
      </div>

      {/* Churn Breakdown (Pie) */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PieChartIcon size={20} className="text-blue-600" />
            <h3 className="font-bold text-[#172A3A] text-lg">{t('churnBreakdown')}</h3>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-gray-100 rounded-full transition"
            title="Refresh data"
          >
            <RefreshCw size={16} className={`text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingChurn ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-32 h-32 bg-gray-200 rounded-full mb-2"></div>
              <div className="w-32 h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : churnEmpty || churnData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-center">
            <div className="text-gray-500">
              <PieChartIcon size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="font-medium">No churned clients</p>
              <p className="text-sm mt-1">Great news! You haven't lost any clients</p>
            </div>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={churnData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {churnData.map((entry, idx) => (
                    <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
                <Tooltip content={<ChurnTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {!loadingChurn && !churnEmpty && churnData.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 border-t pt-3 text-center">
            <span>
              Total churned: <span className="font-semibold text-red-600">
                {churnData.reduce((sum, d) => sum + (d.count || 0), 0)} clients
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
