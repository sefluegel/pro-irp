// src/components/MorningBriefing.jsx
// Dynamic AI Assistant Briefing - Time-aware, personalized briefings
import React, { useState, useEffect } from 'react';
import { getDynamicBriefing } from '../api';
import { Link } from 'react-router-dom';
import {
  Sun, Moon, Sunset, RefreshCw, Phone, CheckCircle2,
  AlertTriangle, TrendingUp, Clock, ChevronDown, ChevronUp,
  Bot
} from 'lucide-react';

const RISK_COLORS = {
  severe: 'bg-red-100 text-red-800 border-red-200',
  critical: 'bg-red-50 text-red-700 border-red-100',
  high: 'bg-orange-50 text-orange-700 border-orange-100',
  elevated: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  moderate: 'bg-blue-50 text-blue-700 border-blue-100',
  low: 'bg-green-50 text-green-700 border-green-100',
  stable: 'bg-green-100 text-green-800 border-green-200'
};

function getRiskCategory(score) {
  if (score >= 90) return 'severe';
  if (score >= 80) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 50) return 'elevated';
  if (score >= 35) return 'moderate';
  if (score >= 20) return 'low';
  return 'stable';
}

export default function MorningBriefing({ compact = false }) {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(!compact);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBriefing();
  }, []);

  async function loadBriefing() {
    try {
      setLoading(true);
      setError(null);
      const data = await getDynamicBriefing();
      setBriefing(data.briefing);
    } catch (err) {
      console.error('[MorningBriefing] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadBriefing();
    setRefreshing(false);
  }

  // Get time-appropriate icon
  function getTimeIcon() {
    if (!briefing) return <Sun className="w-6 h-6" />;
    switch (briefing.timeOfDay) {
      case 'morning': return <Sun className="w-6 h-6" />;
      case 'afternoon': return <Sunset className="w-6 h-6" />;
      case 'evening': return <Moon className="w-6 h-6" />;
      default: return <Sun className="w-6 h-6" />;
    }
  }

  // Get gradient based on time of day
  function getHeaderGradient() {
    if (!briefing) return 'from-blue-600 to-indigo-600';
    switch (briefing.timeOfDay) {
      case 'morning': return 'from-amber-500 to-orange-500';
      case 'afternoon': return 'from-blue-500 to-indigo-500';
      case 'evening': return 'from-indigo-600 to-purple-600';
      default: return 'from-blue-600 to-indigo-600';
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          <Bot className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p>Unable to load your briefing</p>
          <button
            onClick={loadBriefing}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mx-auto"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          <Bot className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p>No briefing available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header with assistant greeting */}
      <div
        className={`px-6 py-4 bg-gradient-to-r ${getHeaderGradient()} text-white cursor-pointer`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getTimeIcon()}
            <div>
              <h2 className="font-semibold text-lg">
                {briefing.greeting}, {briefing.userName}!
              </h2>
              <p className="text-sm opacity-90">
                Your {briefing.timeOfDay} brief from <span className="font-semibold">{briefing.assistantName}</span>, your AI assistant
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); handleRefresh(); }}
              className="p-2 hover:bg-white/20 rounded-full transition"
              title="Refresh briefing"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="p-6 space-y-6">
          {/* Main narrative from the assistant */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-slate-700 leading-relaxed">
                  {briefing.narrative}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickStat
              icon={<AlertTriangle className="w-5 h-5" />}
              label="At Risk"
              value={briefing.stats.criticalRisk + briefing.stats.highRisk}
              color={briefing.stats.criticalRisk > 0 ? 'text-red-600' : 'text-orange-600'}
              bgColor={briefing.stats.criticalRisk > 0 ? 'bg-red-50' : 'bg-orange-50'}
            />
            <QuickStat
              icon={<Clock className="w-5 h-5" />}
              label="Tasks Today"
              value={briefing.tasks.pending}
              subtext={briefing.tasks.completed > 0 ? `${briefing.tasks.completed} done` : null}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            <QuickStat
              icon={<Phone className="w-5 h-5" />}
              label="Calls Made"
              value={briefing.todayProgress.calls}
              color="text-green-600"
              bgColor="bg-green-50"
            />
            <QuickStat
              icon={<CheckCircle2 className="w-5 h-5" />}
              label="Healthy Clients"
              value={briefing.stats.healthyClients}
              color="text-emerald-600"
              bgColor="bg-emerald-50"
            />
          </div>

          {/* Action Items */}
          {briefing.actionItems?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-500" />
                Action Items
              </h3>
              <div className="space-y-2">
                {briefing.actionItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Priority Clients */}
          {briefing.priorityClients?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-500" />
                Priority Clients
              </h3>
              <div className="space-y-2">
                {briefing.priorityClients.slice(0, 5).map((client, idx) => (
                  <Link
                    key={client.id}
                    to={`/clients/${client.id}`}
                    className={`block p-3 rounded-lg border transition-colors hover:shadow-sm ${
                      RISK_COLORS[getRiskCategory(client.risk_score)]
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{client.first_name} {client.last_name}</p>
                        <p className="text-sm opacity-75">
                          {client.top_risk_factor || 'High risk score'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold">{client.risk_score}</span>
                        <p className="text-xs opacity-75">Risk Score</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Risk Changes */}
          {briefing.riskChanges?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <TrendingUp size={16} className="text-red-500" />
                Risk Increases Today
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {briefing.riskChanges.map((change, idx) => (
                  <Link
                    key={change.id}
                    to={`/clients/${change.id}`}
                    className="p-3 rounded-lg border border-red-200 bg-red-50 hover:shadow-sm transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-red-900">{change.first_name} {change.last_name}</p>
                        <p className="text-xs text-red-700">
                          {change.previous_score} → {change.risk_score}
                        </p>
                      </div>
                      <div className="text-red-600 font-bold">
                        +{change.score_change}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Insights */}
          {briefing.insights?.length > 0 && (
            <div className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 border-t">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Insights
              </h3>
              <ul className="space-y-2">
                {briefing.insights.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-blue-500 mt-0.5">•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuickStat({ icon, label, value, subtext, color, bgColor }) {
  return (
    <div className={`p-4 rounded-lg ${bgColor} border border-gray-100`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={color}>{icon}</span>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
        {subtext && <span className="text-sm text-gray-500">{subtext}</span>}
      </div>
    </div>
  );
}
