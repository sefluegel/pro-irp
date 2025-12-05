// src/pages/founder/ValueDelivery.jsx
// Level 2: Value Delivery Detail Page

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Bell,
  Send,
  Users,
  ChevronRight,
  ExternalLink,
  Filter
} from "lucide-react";
import { getPilotValue, getPilotValueRiskAlerts, getPilotValueSaved, markClientSaved, markClientChurned } from "../../api";

const PERIOD_OPTIONS = [
  { value: '7_days', label: 'Last 7 Days' },
  { value: '30_days', label: 'Last 30 Days' },
  { value: '90_days', label: 'Last 90 Days' }
];

export default function ValueDelivery() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7_days');
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [riskAlerts, setRiskAlerts] = useState(null);
  const [savedClients, setSavedClients] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [period]);

  useEffect(() => {
    if (activeTab === 'alerts') {
      loadRiskAlerts();
    } else if (activeTab === 'saved') {
      loadSavedClients();
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getPilotValue({ period });
      setData(res?.data);
    } catch (err) {
      console.error('Failed to load value data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRiskAlerts = async () => {
    setDetailLoading(true);
    try {
      const res = await getPilotValueRiskAlerts({ period, limit: 50 });
      setRiskAlerts(res?.data);
    } catch (err) {
      console.error('Failed to load risk alerts:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const loadSavedClients = async () => {
    setDetailLoading(true);
    try {
      const res = await getPilotValueSaved({ limit: 50 });
      setSavedClients(res?.data);
    } catch (err) {
      console.error('Failed to load saved clients:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/founder')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Command Center
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-amber-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">Value Delivery</h1>
                <p className="text-slate-400">Track risk alerts, interventions, and retention outcomes</p>
              </div>
            </div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 text-white rounded-lg px-4 py-2 text-sm"
            >
              {PERIOD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Bell className="w-6 h-6" />}
            label="Risk Alerts"
            value={data?.riskAlerts?.generated || 0}
            subtitle={`${data?.riskAlerts?.actedOnPercent || 0}% acted on`}
            color="amber"
          />
          <StatCard
            icon={<Send className="w-6 h-6" />}
            label="Automations Sent"
            value={data?.automations?.sent || 0}
            subtitle={`${data?.automations?.deliveryRate || 0}% delivered`}
            color="blue"
          />
          <StatCard
            icon={<CheckCircle2 className="w-6 h-6" />}
            label="Clients Saved"
            value={data?.retention?.saved || 0}
            subtitle={`${data?.retention?.savedThisPeriod || 0} this period`}
            color="emerald"
          />
          <StatCard
            icon={<DollarSign className="w-6 h-6" />}
            label="Revenue Saved"
            value={formatCurrency(data?.revenue?.estimatedSaved || 0)}
            subtitle={`@ ${formatCurrency(data?.revenue?.avgCommission || 500)}/client`}
            color="violet"
          />
        </div>

        {/* Key Metrics */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Risk Response Time */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">Response Time</h3>
            </div>
            <div className="text-center py-4">
              <div className="text-5xl font-bold text-white mb-2">
                {data?.riskAlerts?.avgTimeToActionHours || '—'}
              </div>
              <div className="text-slate-400">hours average time to action</div>
            </div>
            <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
              <div className="text-sm text-slate-400 mb-1">Goal: Under 24 hours</div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    (data?.riskAlerts?.avgTimeToActionHours || 0) <= 24 ? 'bg-emerald-500' :
                    (data?.riskAlerts?.avgTimeToActionHours || 0) <= 48 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, (24 / (data?.riskAlerts?.avgTimeToActionHours || 24)) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Retention Breakdown */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-semibold text-white">Retention Outcomes</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400">Saved</span>
                  <span className="text-emerald-400 font-bold">{data?.retention?.saved || 0}</span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${((data?.retention?.saved || 0) / ((data?.retention?.saved || 0) + (data?.retention?.churned || 1))) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400">Churned</span>
                  <span className="text-red-400 font-bold">{data?.retention?.churned || 0}</span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${((data?.retention?.churned || 0) / ((data?.retention?.saved || 0) + (data?.retention?.churned || 1))) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Save Rate</span>
                <span className="text-2xl font-bold text-emerald-400">
                  {data?.retention?.saved && data?.retention?.churned
                    ? Math.round((data.retention.saved / (data.retention.saved + data.retention.churned)) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Automation Performance */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Automation ROI</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Sent</span>
                <span className="text-white font-medium">{data?.automations?.sent || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Delivered</span>
                <span className="text-white font-medium">{data?.automations?.delivered || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Unique Clients</span>
                <span className="text-white font-medium">{data?.automations?.uniqueClients || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Re-engagements</span>
                <span className="text-emerald-400 font-bold">{data?.automations?.reengagements || 0}</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="text-sm text-blue-400">
                {data?.automations?.reengagements || 0} clients responded after automated outreach
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'overview' ? 'bg-amber-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'alerts' ? 'bg-amber-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Risk Alerts
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'saved' ? 'bg-amber-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Saved Clients
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">How Value is Calculated</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-4xl font-bold text-emerald-400 mb-2">
                  {data?.retention?.saved || 0}
                </div>
                <div className="text-slate-400">Clients marked as "saved"</div>
              </div>
              <div className="flex items-center text-2xl text-slate-400">×</div>
              <div>
                <div className="text-4xl font-bold text-blue-400 mb-2">
                  {formatCurrency(data?.revenue?.avgCommission || 500)}
                </div>
                <div className="text-slate-400">Avg annual commission</div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <div className="flex items-center justify-between">
                <span className="text-xl text-slate-300">Estimated Revenue Saved</span>
                <span className="text-4xl font-bold text-white">
                  {formatCurrency(data?.revenue?.estimatedSaved || 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700/50">
              <h3 className="text-lg font-semibold text-white">Recent Risk Alerts</h3>
            </div>
            {detailLoading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/30">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Client</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Risk at Alert</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Current Risk</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Time to Action</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Agent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {riskAlerts?.alerts?.map(alert => (
                      <tr key={alert.id} className="hover:bg-slate-700/20">
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">{alert.clientName || 'Unknown'}</div>
                          <div className="text-xs text-slate-400">{alert.clientEmail}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            alert.riskScoreAtAlert >= 60 ? 'bg-red-500/20 text-red-400' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                            {alert.riskScoreAtAlert}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            alert.currentRiskScore >= 60 ? 'bg-red-500/20 text-red-400' :
                            alert.currentRiskScore >= 30 ? 'bg-amber-500/20 text-amber-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {alert.currentRiskScore}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {alert.actedOnAt ? (
                            <span className="text-emerald-400 flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              Acted
                            </span>
                          ) : (
                            <span className="text-slate-500 flex items-center justify-center gap-1">
                              <Clock className="w-4 h-4" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-300">
                          {alert.timeToAction ? `${alert.timeToAction}h` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{alert.agentName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700/50">
              <h3 className="text-lg font-semibold text-white">Saved Clients</h3>
              <p className="text-sm text-slate-400">Clients retained through intervention</p>
            </div>
            {detailLoading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {savedClients?.clients?.map(client => (
                  <div
                    key={client.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-700/20 cursor-pointer"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-white font-medium">{client.name}</div>
                        <div className="text-xs text-slate-400">{client.email || client.phone}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-slate-400">Saved by</div>
                        <div className="text-white">{client.savedBy || client.agentName}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-400">Date</div>
                        <div className="text-white">
                          {client.savedAt ? new Date(client.savedAt).toLocaleDateString() : '—'}
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
                {(!savedClients?.clients || savedClients.clients.length === 0) && (
                  <div className="p-8 text-center text-slate-500">
                    No saved clients yet
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, subtitle, color }) {
  const colorStyles = {
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/30'
  };

  const iconColors = {
    amber: 'text-amber-400',
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    violet: 'text-violet-400'
  };

  return (
    <div className={`bg-gradient-to-br ${colorStyles[color]} border rounded-2xl p-4`}>
      <div className={`${iconColors[color]} mb-3`}>{icon}</div>
      <div className="text-sm text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-slate-500">{subtitle}</div>
    </div>
  );
}
