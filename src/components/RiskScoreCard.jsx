// src/components/RiskScoreCard.jsx
// Displays client risk score with contributing factors and category breakdown
import React, { useState, useEffect } from 'react';
import { getChurnPredictionScore, recalculateChurnScore, getRiskHistory } from '../api';

// Risk category configuration matching the spec
const RISK_CATEGORIES = {
  stable: { label: 'Stable', color: 'bg-green-600', textColor: 'text-green-700', lightBg: 'bg-green-100', range: '0-24' },
  low: { label: 'Low', color: 'bg-green-500', textColor: 'text-green-600', lightBg: 'bg-green-50', range: '25-39' },
  moderate: { label: 'Moderate', color: 'bg-blue-500', textColor: 'text-blue-600', lightBg: 'bg-blue-50', range: '40-54' },
  elevated: { label: 'Elevated', color: 'bg-yellow-500', textColor: 'text-yellow-600', lightBg: 'bg-yellow-50', range: '55-69' },
  high: { label: 'High', color: 'bg-orange-500', textColor: 'text-orange-600', lightBg: 'bg-orange-50', range: '70-84' },
  critical: { label: 'Critical', color: 'bg-red-500', textColor: 'text-red-600', lightBg: 'bg-red-50', range: '85-94' },
  severe: { label: 'Severe', color: 'bg-red-600', textColor: 'text-red-700', lightBg: 'bg-red-100', range: '95-100' }
};

// Scoring category weights from spec
const CATEGORY_CONFIG = {
  engagement: { weight: 40, label: 'Engagement', color: 'bg-blue-500' },
  utilization: { weight: 22, label: 'Utilization', color: 'bg-purple-500' },
  benefit_fit: { weight: 18, label: 'Benefit Fit', color: 'bg-green-500' },
  life_events: { weight: 8, label: 'Life Events', color: 'bg-orange-500' },
  external: { weight: 12, label: 'External Risk', color: 'bg-red-500' }
};

export default function RiskScoreCard({ clientId, initialScore, onScoreChange }) {
  const [riskData, setRiskData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState(null);
  const [showFactors, setShowFactors] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadRiskData();
  }, [clientId]);

  const loadRiskData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [scoreResult, historyResult] = await Promise.all([
        getChurnPredictionScore(clientId),
        getRiskHistory(clientId, { limit: 30 }).catch(() => ({ history: [] }))
      ]);
      setRiskData(scoreResult);
      setHistory(historyResult.history || []);
      if (onScoreChange && scoreResult.score !== initialScore) {
        onScoreChange(scoreResult.score);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      setError(null);
      const result = await recalculateChurnScore(clientId);
      setRiskData(result);
      if (onScoreChange) {
        onScoreChange(result.score);
      }
      const historyResult = await getRiskHistory(clientId, { limit: 30 }).catch(() => ({ history: [] }));
      setHistory(historyResult.history || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setRecalculating(false);
    }
  };

  const getRiskColor = (score) => {
    if (score >= 95) return { bg: 'bg-red-600', text: 'text-red-700', light: 'bg-red-100' };
    if (score >= 85) return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50' };
    if (score >= 70) return { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50' };
    if (score >= 55) return { bg: 'bg-yellow-500', text: 'text-yellow-600', light: 'bg-yellow-50' };
    if (score >= 40) return { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50' };
    if (score >= 25) return { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50' };
    return { bg: 'bg-green-600', text: 'text-green-700', light: 'bg-green-100' };
  };

  const getRiskCategory = (score) => {
    if (score >= 95) return RISK_CATEGORIES.severe;
    if (score >= 85) return RISK_CATEGORIES.critical;
    if (score >= 70) return RISK_CATEGORIES.high;
    if (score >= 55) return RISK_CATEGORIES.elevated;
    if (score >= 40) return RISK_CATEGORIES.moderate;
    if (score >= 25) return RISK_CATEGORIES.low;
    return RISK_CATEGORIES.stable;
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'engagement':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'utilization':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        );
      case 'benefit_fit':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'life_events':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      case 'external':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const score = riskData?.score ?? initialScore ?? 0;
  const colors = getRiskColor(score);
  const category = getRiskCategory(score);
  const factors = riskData?.factors || [];
  const categoryBreakdown = riskData?.categoryBreakdown || {};
  const autoTrigger = riskData?.autoTrigger || null;

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 ${colors.light} rounded-lg flex items-center justify-center`}>
              <svg className={`w-6 h-6 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Churn Risk Score</h3>
              <p className="text-sm text-gray-500">AI-powered prediction</p>
            </div>
          </div>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {recalculating ? 'Calculating...' : 'Recalculate'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Auto-100 Trigger Alert */}
      {autoTrigger && (
        <div className="mx-6 mt-4 p-4 bg-red-100 border border-red-300 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold text-red-800">Auto-100 Trigger Active</span>
          </div>
          <p className="mt-1 text-sm text-red-700">{autoTrigger}</p>
        </div>
      )}

      {/* Score Display */}
      <div className="p-6">
        <div className="flex items-center space-x-6">
          {/* Score Circle */}
          <div className="relative">
            <svg className="w-28 h-28 transform -rotate-90">
              <circle cx="56" cy="56" r="48" stroke="#e5e7eb" strokeWidth="10" fill="none" />
              <circle
                cx="56" cy="56" r="48"
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 301.6} 301.6`}
                className={colors.text}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900">{score}</span>
              <span className="text-xs text-gray-500">/ 100</span>
            </div>
          </div>

          {/* Score Info */}
          <div className="flex-1">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${category.lightBg} ${category.textColor}`}>
              {category.label} Risk
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {score >= 85
                ? 'Immediate action required. This client is at severe risk of churning.'
                : score >= 70
                ? 'High priority. Contact this client within 24 hours.'
                : score >= 55
                ? 'Elevated risk. Schedule a proactive check-in.'
                : score >= 40
                ? 'Monitor regularly and maintain engagement.'
                : 'Client is stable with low churn risk.'}
            </p>
            {riskData?.lastScored && (
              <p className="mt-2 text-xs text-gray-400">
                Last calculated: {new Date(riskData.lastScored).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        {Object.keys(categoryBreakdown).length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Score Breakdown by Category</h4>
            <div className="space-y-3">
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                const categoryScore = categoryBreakdown[key] || 0;
                const maxPoints = config.weight;
                const percentage = maxPoints > 0 ? (categoryScore / maxPoints) * 100 : 0;

                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{getCategoryIcon(key)}</span>
                        <span className="font-medium text-gray-700">{config.label}</span>
                        <span className="text-xs text-gray-400">({config.weight}% weight)</span>
                      </div>
                      <span className={`font-semibold ${
                        percentage >= 70 ? 'text-red-600' :
                        percentage >= 40 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {categoryScore.toFixed(1)} pts
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          percentage >= 70 ? 'bg-red-500' :
                          percentage >= 40 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Contributing Factors */}
        {factors.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowFactors(!showFactors)}
              className="flex items-center justify-between w-full text-left"
            >
              <h4 className="text-sm font-semibold text-gray-700">
                Active Risk Factors ({factors.length})
              </h4>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${showFactors ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showFactors && (
              <div className="mt-3 space-y-2">
                {factors.sort((a, b) => (b.points || 0) - (a.points || 0)).map((factor, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="text-gray-400 flex-shrink-0">
                        {getCategoryIcon(factor.category)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{factor.name}</p>
                        {factor.value && (
                          <p className="text-xs text-gray-500 truncate">{factor.value}</p>
                        )}
                      </div>
                    </div>
                    <span className={`text-sm font-semibold flex-shrink-0 ml-2 ${
                      factor.points >= 15 ? 'text-red-600' :
                      factor.points >= 8 ? 'text-orange-600' :
                      factor.points >= 3 ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      +{factor.points?.toFixed(1) || 0}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Score History */}
        {history.length > 1 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center justify-between w-full text-left"
            >
              <h4 className="text-sm font-semibold text-gray-700">Score History (30 days)</h4>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${showHistory ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showHistory ? (
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                {history.map((h, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm py-1">
                    <span className="text-gray-500">
                      {new Date(h.scored_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${getRiskColor(h.risk_score).text}`}>
                        {h.risk_score}
                      </span>
                      {idx < history.length - 1 && (
                        <span className={`text-xs ${
                          h.risk_score > history[idx + 1].risk_score ? 'text-red-500' :
                          h.risk_score < history[idx + 1].risk_score ? 'text-green-500' :
                          'text-gray-400'
                        }`}>
                          {h.risk_score > history[idx + 1].risk_score ? '+' : ''}
                          {h.risk_score - history[idx + 1].risk_score}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 flex items-end space-x-1 h-12">
                {history.slice(0, 14).reverse().map((h, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 rounded-t ${getRiskColor(h.risk_score).bg}`}
                    style={{ height: `${Math.max(8, (h.risk_score / 100) * 100)}%` }}
                    title={`${h.risk_score} - ${new Date(h.scored_at).toLocaleDateString()}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
