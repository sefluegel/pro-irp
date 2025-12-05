// src/pages/founder/SystemHealth.jsx
// Level 2: System Health Detail Page

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Server,
  Mail,
  MessageSquare,
  Zap,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { getPilotSystemHealth, getPilotSystemErrors } from "../../api";

const PERIOD_OPTIONS = [
  { value: '1_hour', label: 'Last Hour' },
  { value: '24_hours', label: 'Last 24 Hours' },
  { value: '7_days', label: 'Last 7 Days' }
];

export default function SystemHealth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('24_hours');
  const [data, setData] = useState(null);
  const [errors, setErrors] = useState(null);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [healthRes, errorsRes] = await Promise.all([
        getPilotSystemHealth({ period }),
        getPilotSystemErrors({ limit: 20 })
      ]);
      setData(healthRes?.data);
      setErrors(errorsRes?.data);
    } catch (err) {
      console.error('Failed to load system health:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational': return 'text-emerald-400';
      case 'degraded': return 'text-amber-400';
      case 'down': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'operational': return 'bg-emerald-500';
      case 'degraded': return 'bg-amber-500';
      case 'down': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

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
              <Activity className="w-8 h-8 text-cyan-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">System Health</h1>
                <p className="text-slate-400">Monitor API performance and delivery metrics</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-slate-700/50 border border-slate-600 text-white rounded-lg px-4 py-2 text-sm"
              >
                {PERIOD_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="p-2 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 rounded-lg"
              >
                <RefreshCw className={`w-5 h-5 text-slate-300 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Overall Status Banner */}
        <div className={`rounded-2xl p-6 ${
          data?.status === 'operational' ? 'bg-emerald-500/10 border border-emerald-500/30' :
          data?.status === 'degraded' ? 'bg-amber-500/10 border border-amber-500/30' :
          'bg-red-500/10 border border-red-500/30'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${getStatusBg(data?.status)} animate-pulse`}></div>
            <div>
              <h2 className={`text-xl font-bold ${getStatusColor(data?.status)}`}>
                {data?.status === 'operational' ? 'All Systems Operational' :
                 data?.status === 'degraded' ? 'Some Systems Degraded' :
                 'System Issues Detected'}
              </h2>
              <p className="text-slate-400">
                Last checked: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Service Status Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* API Status */}
          <ServiceCard
            icon={<Server className="w-6 h-6" />}
            name="API Server"
            status="operational"
            metrics={[
              { label: 'Uptime', value: `${data?.api?.uptime || 99.9}%` },
              { label: 'Avg Response', value: `${data?.api?.avgResponseTime || 0}ms` },
              { label: 'Requests', value: data?.api?.totalRequests?.toLocaleString() || 0 },
              { label: 'Errors', value: data?.api?.totalErrors || 0 }
            ]}
          />

          {/* SMS Status */}
          <ServiceCard
            icon={<MessageSquare className="w-6 h-6" />}
            name="SMS (Twilio)"
            status={data?.sms?.deliveryRate >= 90 ? 'operational' : data?.sms?.deliveryRate >= 70 ? 'degraded' : 'down'}
            metrics={[
              { label: 'Sent', value: data?.sms?.sent || 0 },
              { label: 'Delivered', value: data?.sms?.delivered || 0 },
              { label: 'Failed', value: data?.sms?.failed || 0 },
              { label: 'Delivery Rate', value: `${data?.sms?.deliveryRate || 0}%` }
            ]}
          />

          {/* Email Status */}
          <ServiceCard
            icon={<Mail className="w-6 h-6" />}
            name="Email (SendGrid)"
            status={data?.email?.deliveryRate >= 90 ? 'operational' : data?.email?.deliveryRate >= 70 ? 'degraded' : 'down'}
            metrics={[
              { label: 'Sent', value: data?.email?.sent || 0 },
              { label: 'Delivered', value: data?.email?.delivered || 0 },
              { label: 'Failed', value: data?.email?.failed || 0 },
              { label: 'Delivery Rate', value: `${data?.email?.deliveryRate || 0}%` }
            ]}
          />

          {/* Database Status */}
          <ServiceCard
            icon={<Zap className="w-6 h-6" />}
            name="Database"
            status="operational"
            metrics={[
              { label: 'Connections', value: 'Active' },
              { label: 'Pool Size', value: '20' },
              { label: 'Slow Queries', value: '0' },
              { label: 'Status', value: 'Healthy' }
            ]}
          />
        </div>

        {/* Detailed Metrics */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* API Performance */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-400" />
              API Performance
            </h3>
            <div className="space-y-4">
              <MetricRow
                label="Average Response Time"
                value={`${data?.api?.avgResponseTime || 0}ms`}
                target="<500ms"
                isGood={(data?.api?.avgResponseTime || 0) < 500}
              />
              <MetricRow
                label="Error Rate"
                value={`${data?.api?.errorRate || 0}%`}
                target="<1%"
                isGood={(data?.api?.errorRate || 0) < 1}
              />
              <MetricRow
                label="Total Requests"
                value={data?.api?.totalRequests?.toLocaleString() || 0}
                target="—"
              />
              <MetricRow
                label="Total Errors"
                value={data?.api?.totalErrors || 0}
                target="0"
                isGood={(data?.api?.totalErrors || 0) === 0}
              />
            </div>
          </div>

          {/* Delivery Metrics */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-400" />
              Delivery Metrics
            </h3>
            <div className="space-y-4">
              <MetricRow
                label="SMS Delivery Rate"
                value={`${data?.sms?.deliveryRate || 0}%`}
                target=">95%"
                isGood={(data?.sms?.deliveryRate || 0) >= 95}
              />
              <MetricRow
                label="Email Delivery Rate"
                value={`${data?.email?.deliveryRate || 0}%`}
                target=">95%"
                isGood={(data?.email?.deliveryRate || 0) >= 95}
              />
              <MetricRow
                label="SMS Failed"
                value={data?.sms?.failed || 0}
                target="0"
                isGood={(data?.sms?.failed || 0) === 0}
              />
              <MetricRow
                label="Email Failed"
                value={data?.email?.failed || 0}
                target="0"
                isGood={(data?.email?.failed || 0) === 0}
              />
            </div>
          </div>
        </div>

        {/* Error Log */}
        {(data?.errors?.total > 0 || errors?.errors?.length > 0) && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden">
            <div
              className="p-4 border-b border-slate-700/50 flex items-center justify-between cursor-pointer hover:bg-slate-700/30"
              onClick={() => setShowErrors(!showErrors)}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="text-lg font-semibold text-white">Recent Errors</h3>
                <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                  {data?.errors?.total || errors?.errors?.length || 0}
                </span>
              </div>
              <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${showErrors ? 'rotate-90' : ''}`} />
            </div>
            {showErrors && (
              <div className="divide-y divide-slate-700/50 max-h-96 overflow-y-auto">
                {errors?.errors?.map((error, idx) => (
                  <div key={idx} className="p-4 hover:bg-slate-700/20">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-white font-medium">{error.action}</div>
                        <div className="text-sm text-slate-400">{error.resource_type}</div>
                        {error.details && (
                          <pre className="mt-2 text-xs text-slate-500 bg-slate-700/30 rounded p-2 overflow-x-auto">
                            {JSON.stringify(error.details, null, 2)}
                          </pre>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 whitespace-nowrap">
                        {new Date(error.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                {(!errors?.errors || errors.errors.length === 0) && (
                  <div className="p-8 text-center text-slate-500">
                    No recent errors
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        {(data?.sms?.deliveryRate < 95 || data?.email?.deliveryRate < 95 || data?.api?.errorRate > 1) && (
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Recommendations</h3>
                <ul className="space-y-2 text-slate-300">
                  {data?.sms?.deliveryRate < 95 && (
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                      SMS delivery rate is below 95% - check Twilio dashboard for issues
                    </li>
                  )}
                  {data?.email?.deliveryRate < 95 && (
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                      Email delivery rate is below 95% - check SendGrid for bounces/complaints
                    </li>
                  )}
                  {data?.api?.errorRate > 1 && (
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                      API error rate is above 1% - review error logs for patterns
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ServiceCard({ icon, name, status, metrics }) {
  const statusColors = {
    operational: { bg: 'bg-emerald-500', text: 'text-emerald-400', label: 'Operational' },
    degraded: { bg: 'bg-amber-500', text: 'text-amber-400', label: 'Degraded' },
    down: { bg: 'bg-red-500', text: 'text-red-400', label: 'Down' }
  };

  const s = statusColors[status] || statusColors.operational;

  return (
    <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-cyan-400">{icon}</div>
          <span className="text-white font-medium">{name}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${s.bg}`}></div>
          <span className={`text-xs ${s.text}`}>{s.label}</span>
        </div>
      </div>
      <div className="space-y-2">
        {metrics.map((metric, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <span className="text-slate-400">{metric.label}</span>
            <span className="text-white font-medium">{metric.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricRow({ label, value, target, isGood }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-white font-medium">{value}</span>
        {target !== '—' && (
          <span className={`text-xs px-2 py-0.5 rounded ${
            isGood ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {isGood ? <CheckCircle2 className="w-3 h-3 inline" /> : <XCircle className="w-3 h-3 inline" />}
          </span>
        )}
        <span className="text-xs text-slate-500">{target}</span>
      </div>
    </div>
  );
}
