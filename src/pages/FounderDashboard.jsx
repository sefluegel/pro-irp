// /frontend/src/pages/FounderDashboard.jsx

import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Users, TrendingUp, MessageSquare, CheckCircle, Activity, Award, Brain, Target, BarChart2, AlertTriangle } from "lucide-react";
import {
  getFounderOverview,
  getModelAccuracy,
  getChurnAnalysis,
  getInterventionEffectiveness,
  getRiskFactorAnalysis,
  getWeightRecommendations,
  triggerMLTraining
} from "../api";

const PERIOD_OPTIONS = [
  { value: '7_days', label: 'Last 7 Days' },
  { value: '30_days', label: 'Last 30 Days' },
  { value: '90_days', label: 'Last 90 Days' },
  { value: '1_year', label: 'Last Year' }
];

const FounderDashboard = () => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // AI Analytics states
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'ai-analytics'
  const [aiPeriod, setAiPeriod] = useState('30_days');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState({
    overview: null,
    accuracy: null,
    churnAnalysis: null,
    interventions: null,
    riskFactors: null,
    weightRecs: null
  });
  const [trainingInProgress, setTrainingInProgress] = useState(false);

  useEffect(() => {
    async function fetchFounderMetrics() {
      try {
        const BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";
        const token = localStorage.getItem("token");
        const res = await fetch(`${BASE}/metrics/founder`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
          if (res.status === 403) {
            throw new Error(t('accessDeniedFounder'));
          }
          throw new Error(t('failedToFetchFounder'));
        }

        const json = await res.json();
        if (json.ok) {
          setMetrics(json.data);
        } else {
          throw new Error(json.error || "Failed to load metrics");
        }
      } catch (err) {
        console.error("Founder metrics error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchFounderMetrics();
  }, []);

  // Load AI Analytics data
  const loadAiData = useCallback(async () => {
    if (activeTab !== 'ai-analytics') return;

    setAiLoading(true);
    try {
      const [overview, accuracy, churnAnalysis, interventions, riskFactors, weightRecs] = await Promise.all([
        getFounderOverview({ period: aiPeriod }).catch(() => null),
        getModelAccuracy({ period: aiPeriod }).catch(() => null),
        getChurnAnalysis({ period: aiPeriod }).catch(() => null),
        getInterventionEffectiveness({ period: aiPeriod }).catch(() => null),
        getRiskFactorAnalysis({ period: aiPeriod }).catch(() => null),
        getWeightRecommendations().catch(() => null)
      ]);

      setAiData({ overview, accuracy, churnAnalysis, interventions, riskFactors, weightRecs });
    } catch (err) {
      console.error("AI Analytics error:", err);
    } finally {
      setAiLoading(false);
    }
  }, [activeTab, aiPeriod]);

  useEffect(() => {
    loadAiData();
  }, [loadAiData]);

  async function handleTriggerTraining() {
    if (!window.confirm('This will trigger model recalibration. Continue?')) return;
    setTrainingInProgress(true);
    try {
      await triggerMLTraining();
      alert('Model training initiated. Results will be available within 24 hours.');
    } catch (err) {
      alert('Failed to trigger training: ' + err.message);
    } finally {
      setTrainingInProgress(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-slate-500">{t('loadingFounderMetrics')}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4" style={{ fontFamily: "Inter, sans-serif" }}>
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">
            <strong>Error:</strong> {error}
          </div>
        </div>
      </div>
    );
  }

  const { agents, clients, retention, communications, tasks, adoption, topPerformers } = metrics || {};

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[#172A3A] mb-2">
              {t('founderDashboard')}
            </h1>
            <p className="text-slate-600 text-lg">
              {t('trackPilotPerformance')}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-[#172A3A] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart2 size={18} />
              Business Metrics
            </div>
          </button>
          <button
            onClick={() => setActiveTab('ai-analytics')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'ai-analytics'
                ? 'bg-[#172A3A] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Brain size={18} />
              AI Model Analytics
            </div>
          </button>
        </div>
      </div>

      {/* AI Analytics Tab */}
      {activeTab === 'ai-analytics' && (
        <div className="max-w-7xl mx-auto space-y-8">
          {/* AI Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <select
                value={aiPeriod}
                onChange={(e) => setAiPeriod(e.target.value)}
                className="border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
              >
                {PERIOD_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={loadAiData}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
            <button
              onClick={handleTriggerTraining}
              disabled={trainingInProgress}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {trainingInProgress ? 'Initiating...' : 'Trigger ML Recalibration'}
            </button>
          </div>

          {aiLoading ? (
            <div className="text-center py-12 text-gray-500">Loading AI analytics...</div>
          ) : (
            <>
              {/* AI Model KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <AIMetricCard
                  icon={<Target size={28} className="text-blue-600" />}
                  label="Model Precision"
                  value={aiData.accuracy?.precision ? `${(aiData.accuracy.precision * 100).toFixed(1)}%` : '-'}
                  subtitle="Of predicted churns, how many actually churned"
                  bgColor="bg-blue-50"
                />
                <AIMetricCard
                  icon={<Activity size={28} className="text-green-600" />}
                  label="Model Recall"
                  value={aiData.accuracy?.recall ? `${(aiData.accuracy.recall * 100).toFixed(1)}%` : '-'}
                  subtitle="Of actual churns, how many we predicted"
                  bgColor="bg-green-50"
                />
                <AIMetricCard
                  icon={<TrendingUp size={28} className="text-purple-600" />}
                  label="Churn Rate"
                  value={aiData.overview?.churnRate ? `${aiData.overview.churnRate.toFixed(1)}%` : '-'}
                  subtitle="Current portfolio churn rate"
                  bgColor="bg-purple-50"
                />
                <AIMetricCard
                  icon={<Users size={28} className="text-orange-600" />}
                  label="At-Risk Clients"
                  value={aiData.overview?.atRiskCount || 0}
                  subtitle={`${aiData.overview?.atRiskPercentage?.toFixed(1) || 0}% of portfolio`}
                  bgColor="bg-orange-50"
                />
              </div>

              {/* Churn Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl shadow-md p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle size={20} className="text-red-500" />
                    <h2 className="text-xl font-bold text-[#172A3A]">Top Churn Reasons</h2>
                  </div>
                  {aiData.churnAnalysis?.reasons?.length > 0 ? (
                    <div className="space-y-3">
                      {aiData.churnAnalysis.reasons.slice(0, 6).map((reason, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              idx < 3 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                            }`}>{idx + 1}</span>
                            <span className="text-sm text-gray-700">{reason.reason}</span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            {reason.count} ({reason.percentage?.toFixed(1)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No churn data available</p>
                  )}
                </div>

                <div className="bg-white rounded-2xl shadow-md p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Target size={20} className="text-blue-500" />
                    <h2 className="text-xl font-bold text-[#172A3A]">Intervention Effectiveness</h2>
                  </div>
                  {aiData.interventions?.types?.length > 0 ? (
                    <div className="space-y-3">
                      {aiData.interventions.types.slice(0, 5).map((int, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">{int.type}</span>
                            <span className={`text-sm font-bold ${
                              int.successRate >= 70 ? 'text-green-600' :
                              int.successRate >= 50 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>{int.successRate?.toFixed(1)}% success</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                int.successRate >= 70 ? 'bg-green-500' :
                                int.successRate >= 50 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${int.successRate || 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No intervention data available</p>
                  )}
                </div>
              </div>

              {/* Weight Recommendations */}
              {aiData.weightRecs?.recommendations?.length > 0 && (
                <div className="bg-yellow-50 rounded-2xl shadow-md p-6 border border-yellow-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain size={20} className="text-yellow-600" />
                    <h2 className="text-xl font-bold text-yellow-800">AI Weight Recommendations</h2>
                    <span className="text-sm text-yellow-700 ml-2">
                      Based on {aiData.weightRecs.sampleSize || 0} churn events
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiData.weightRecs.recommendations.map((rec, idx) => (
                      <div key={idx} className="p-4 bg-white rounded-lg border border-yellow-200">
                        <p className="font-medium text-gray-900 mb-1">{rec.factor}</p>
                        <p className="text-sm text-gray-600 mb-2">{rec.reason}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Current: {rec.currentWeight}</span>
                          <span className="text-gray-400">→</span>
                          <span className={`text-sm font-bold ${
                            rec.suggestedWeight > rec.currentWeight ? 'text-red-600' : 'text-green-600'
                          }`}>Suggested: {rec.suggestedWeight}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Factor Performance */}
              {aiData.riskFactors?.factors?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-md p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart2 size={20} className="text-purple-500" />
                    <h2 className="text-xl font-bold text-[#172A3A]">Risk Factor Performance</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {aiData.riskFactors.factors.slice(0, 12).map((factor, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg text-center">
                        <p className="text-xs text-gray-500 mb-1">{factor.name}</p>
                        <p className={`text-lg font-bold ${
                          factor.predictiveValue >= 0.7 ? 'text-green-600' :
                          factor.predictiveValue >= 0.5 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>{(factor.predictiveValue * 100).toFixed(0)}%</p>
                        <p className="text-xs text-gray-400">{factor.category}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Business Metrics Tab (Original Content) */}
      {activeTab === 'overview' && (

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Overview Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            icon={<Users size={28} className="text-blue-600" />}
            label={t('totalAgents')}
            value={agents?.total || 0}
            subtitle={t('activeAgentsCount', { active: agents?.active || 0, inactive: agents?.inactive || 0 })}
            bgColor="bg-blue-50"
          />
          <MetricCard
            icon={<TrendingUp size={28} className="text-green-600" />}
            label={t('totalClients')}
            value={clients?.total || 0}
            subtitle={`${retention?.overall || "0.0%"} ${t('retentionRate').toLowerCase()}`}
            bgColor="bg-green-50"
          />
          <MetricCard
            icon={<MessageSquare size={28} className="text-purple-600" />}
            label={t('communications')}
            value={communications?.total || 0}
            subtitle={t('acrossAllChannels')}
            bgColor="bg-purple-50"
          />
          <MetricCard
            icon={<CheckCircle size={28} className="text-orange-600" />}
            label={t('taskCompletion')}
            value={tasks?.completionRate || "0.0%"}
            subtitle={t('tasksOfTotal', { completed: tasks?.completed || 0, total: tasks?.total || 0 })}
            bgColor="bg-orange-50"
          />
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Agent Performance Table */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users size={20} className="text-[#172A3A]" />
              <h2 className="text-xl font-bold text-[#172A3A]">{t('agentPerformance')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-semibold text-gray-700">{t('agent')}</th>
                    <th className="text-center py-2 font-semibold text-gray-700">{t('clients')}</th>
                    <th className="text-center py-2 font-semibold text-gray-700">{t('active')}</th>
                  </tr>
                </thead>
                <tbody>
                  {clients?.perAgent?.length > 0 ? (
                    clients.perAgent.map((agent, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3">
                          <div className="font-medium text-gray-900">{agent.agentName}</div>
                          <div className="text-xs text-gray-500">{agent.agentEmail}</div>
                        </td>
                        <td className="text-center py-3 font-semibold text-gray-900">
                          {agent.totalClients}
                        </td>
                        <td className="text-center py-3">
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                            {agent.activeClients}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="text-center py-6 text-gray-500">
                        {t('noAgentData')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Performers Leaderboard */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award size={20} className="text-[#FFB800]" />
              <h2 className="text-xl font-bold text-[#172A3A]">{t('topPerformers')}</h2>
            </div>
            <div className="space-y-3">
              {topPerformers?.length > 0 ? (
                topPerformers.map((performer, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
                        style={{
                          background:
                            idx === 0
                              ? "linear-gradient(135deg, #FFD700, #FFA500)"
                              : idx === 1
                              ? "linear-gradient(135deg, #C0C0C0, #808080)"
                              : idx === 2
                              ? "linear-gradient(135deg, #CD7F32, #8B4513)"
                              : "#6B7280"
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{performer.agentName}</div>
                        <div className="text-xs text-gray-600">
                          {performer.clientCount} {t('clients').toLowerCase()} · {performer.totalCommunications} {t('comms')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-700">{performer.retentionRate}</div>
                      <div className="text-xs text-gray-500">{t('retention')}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">{t('noPerformersData')}</div>
              )}
            </div>
          </div>
        </div>

        {/* Communication Breakdown */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={20} className="text-[#172A3A]" />
            <h2 className="text-xl font-bold text-[#172A3A]">{t('communicationActivity')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <CommTypeCard
              type={t('email')}
              count={communications?.byType?.email || 0}
              color="bg-blue-100 text-blue-800"
            />
            <CommTypeCard
              type={t('sms')}
              count={communications?.byType?.sms || 0}
              color="bg-green-100 text-green-800"
            />
            <CommTypeCard
              type={t('call')}
              count={communications?.byType?.call || 0}
              color="bg-purple-100 text-purple-800"
            />
            <CommTypeCard
              type={t('appointment')}
              count={communications?.byType?.appointment || 0}
              color="bg-orange-100 text-orange-800"
            />
          </div>
          {/* Communications per agent */}
          <div className="mt-6">
            <h3 className="font-semibold text-gray-700 mb-3">{t('communicationActivity')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {communications?.perAgent?.length > 0 ? (
                communications.perAgent.map((agent, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200"
                  >
                    <span className="font-medium text-gray-900">{agent.agentName}</span>
                    <span className="font-bold text-[#172A3A]">{agent.totalCommunications}</span>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-4 text-gray-500">
                  {t('noCommunicationData')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Retention & Adoption Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Retention by Agent */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={20} className="text-[#172A3A]" />
              <h2 className="text-xl font-bold text-[#172A3A]">{t('retentionByAgent')}</h2>
            </div>
            <div className="space-y-2">
              {retention?.perAgent?.length > 0 ? (
                retention.perAgent.map((agent, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                    <span className="text-gray-700">{agent.agentName}</span>
                    <span className="font-bold text-green-700">{agent.retentionRate}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">{t('noRetentionData')}</div>
              )}
            </div>
          </div>

          {/* System Adoption */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={20} className="text-[#172A3A]" />
              <h2 className="text-xl font-bold text-[#172A3A]">{t('systemAdoption')}</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className="text-sm text-gray-600 mb-1">{t('csvImportsPerformed')}</div>
                <div className="text-3xl font-extrabold text-[#172A3A]">
                  {adoption?.csvImports || 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {t('bulkClientUploads')}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                <div className="text-sm text-gray-600 mb-1">{t('avgLoginsPerAgent')}</div>
                <div className="text-3xl font-extrabold text-[#172A3A]">
                  {adoption?.avgLoginsPerAgent?.toFixed(1) || "0.0"}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {t('activeEngagement7Days')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ icon, label, value, subtitle, bgColor }) => (
  <div className={`${bgColor} rounded-2xl shadow-md p-6`}>
    <div className="flex items-center justify-between mb-3">
      {icon}
    </div>
    <div className="text-sm font-medium text-gray-600 mb-1">{label}</div>
    <div className="text-3xl font-extrabold text-[#172A3A] mb-2">{value}</div>
    <div className="text-xs text-gray-500">{subtitle}</div>
  </div>
);

// Communication Type Card Component
const CommTypeCard = ({ type, count, color }) => (
  <div className="p-4 rounded-xl border border-gray-200">
    <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-2 ${color}`}>
      {type}
    </div>
    <div className="text-2xl font-extrabold text-[#172A3A]">{count}</div>
  </div>
);

// AI Metric Card Component
const AIMetricCard = ({ icon, label, value, subtitle, bgColor }) => (
  <div className={`${bgColor} rounded-2xl shadow-md p-6`}>
    <div className="flex items-center justify-between mb-3">
      {icon}
    </div>
    <div className="text-sm font-medium text-gray-600 mb-1">{label}</div>
    <div className="text-3xl font-extrabold text-[#172A3A] mb-2">{value}</div>
    <div className="text-xs text-gray-500">{subtitle}</div>
  </div>
);

export default FounderDashboard;
