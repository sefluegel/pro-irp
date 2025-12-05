// src/components/RiskDistributionChart.jsx
// Displays risk distribution across all clients as a visual chart
import React, { useState, useEffect } from 'react';
import { getRiskDistribution } from '../api';
import { Link } from 'react-router-dom';

const RISK_CATEGORIES = [
  { key: 'stable', label: 'Stable', range: '0-24', color: 'bg-green-600', hoverColor: 'hover:bg-green-700', textColor: 'text-green-700' },
  { key: 'low', label: 'Low', range: '25-39', color: 'bg-green-500', hoverColor: 'hover:bg-green-600', textColor: 'text-green-600' },
  { key: 'moderate', label: 'Moderate', range: '40-54', color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600', textColor: 'text-blue-600' },
  { key: 'elevated', label: 'Elevated', range: '55-69', color: 'bg-yellow-500', hoverColor: 'hover:bg-yellow-600', textColor: 'text-yellow-600' },
  { key: 'high', label: 'High', range: '70-84', color: 'bg-orange-500', hoverColor: 'hover:bg-orange-600', textColor: 'text-orange-600' },
  { key: 'critical', label: 'Critical', range: '85-94', color: 'bg-red-500', hoverColor: 'hover:bg-red-600', textColor: 'text-red-600' },
  { key: 'severe', label: 'Severe', range: '95-100', color: 'bg-red-600', hoverColor: 'hover:bg-red-700', textColor: 'text-red-700' }
];

export default function RiskDistributionChart({ compact = false }) {
  const [distribution, setDistribution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  useEffect(() => {
    loadDistribution();
  }, []);

  async function loadDistribution() {
    try {
      const data = await getRiskDistribution();
      setDistribution(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          <p>Failed to load distribution</p>
          <button onClick={loadDistribution} className="mt-2 text-sm text-blue-600 hover:text-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const total = distribution?.total || 0;
  const categories = distribution?.categories || {};

  // Calculate percentages for each category
  const categoryData = RISK_CATEGORIES.map(cat => ({
    ...cat,
    count: categories[cat.key] || 0,
    percentage: total > 0 ? ((categories[cat.key] || 0) / total) * 100 : 0
  }));

  // Summary stats
  const atRisk = (categories.elevated || 0) + (categories.high || 0) + (categories.critical || 0) + (categories.severe || 0);
  const atRiskPercentage = total > 0 ? (atRisk / total) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
          <div>
            <h2 className="font-semibold text-gray-900">Risk Distribution</h2>
            <p className="text-sm text-gray-500">{total} total clients</p>
          </div>
        </div>
        <button
          onClick={loadDistribution}
          className="p-2 text-gray-400 hover:text-gray-600"
          title="Refresh"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="p-6">
        {/* At Risk Summary */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-500">Clients at Risk (Elevated+)</p>
            <p className="text-2xl font-bold text-gray-900">{atRisk}</p>
          </div>
          <div className={`text-right ${atRiskPercentage > 20 ? 'text-red-600' : atRiskPercentage > 10 ? 'text-yellow-600' : 'text-green-600'}`}>
            <p className="text-2xl font-bold">{atRiskPercentage.toFixed(1)}%</p>
            <p className="text-sm">of portfolio</p>
          </div>
        </div>

        {/* Stacked Bar Chart */}
        <div className="mb-6">
          <div className="flex h-10 rounded-lg overflow-hidden">
            {categoryData.map(cat => (
              cat.count > 0 && (
                <Link
                  key={cat.key}
                  to={`/clients?risk_category=${cat.key}`}
                  className={`${cat.color} ${cat.hoverColor} transition-all relative group`}
                  style={{ width: `${Math.max(cat.percentage, 2)}%` }}
                  onMouseEnter={() => setHoveredCategory(cat.key)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  {hoveredCategory === cat.key && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                      {cat.label}: {cat.count} ({cat.percentage.toFixed(1)}%)
                    </div>
                  )}
                </Link>
              )
            ))}
          </div>
        </div>

        {/* Legend */}
        {!compact && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {categoryData.map(cat => (
              <Link
                key={cat.key}
                to={`/clients?risk_category=${cat.key}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className={`w-3 h-3 rounded-full ${cat.color}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{cat.label}</p>
                  <p className="text-xs text-gray-500">
                    {cat.count} ({cat.percentage.toFixed(0)}%)
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Compact Legend */}
        {compact && (
          <div className="flex flex-wrap gap-3">
            {categoryData.filter(c => c.count > 0).map(cat => (
              <div key={cat.key} className="flex items-center gap-1.5 text-xs">
                <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                <span className="text-gray-600">{cat.label}: {cat.count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        {!compact && distribution?.changes && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">24h Changes</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">+{distribution.changes.increased || 0}</p>
                <p className="text-xs text-gray-500">Score Increased</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-400">{distribution.changes.unchanged || 0}</p>
                <p className="text-xs text-gray-500">Unchanged</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">-{distribution.changes.decreased || 0}</p>
                <p className="text-xs text-gray-500">Score Decreased</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
