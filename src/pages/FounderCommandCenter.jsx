// src/pages/FounderCommandCenter.jsx
// Main Founder Dashboard - Level 1 Overview
// Beautiful, comprehensive pilot metrics dashboard with drill-down capability

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  ChevronRight,
  Activity,
  Shield,
  Zap,
  Target,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  Calendar
} from "lucide-react";
import {
  getPilotOverview,
  getPilotAdoption,
  getPilotClientQuality,
  getPilotValue,
  getPilotSystemHealth,
  getPilotFeatureUsage
} from "../api";

const PERIOD_OPTIONS = [
  { value: '24_hours', label: 'Last 24 Hours' },
  { value: '7_days', label: 'Last 7 Days' },
  { value: '30_days', label: 'Last 30 Days' },
  { value: '90_days', label: 'Last 90 Days' }
];

export default function FounderCommandCenter() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('7_days');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [overview, setOverview] = useState(null);
  const [adoption, setAdoption] = useState(null);
  const [clientQuality, setClientQuality] = useState(null);
  const [value, setValue] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [overviewRes, adoptionRes, qualityRes, valueRes, healthRes] = await Promise.all([
        getPilotOverview({ period }),
        getPilotAdoption(),
        getPilotClientQuality(),
        getPilotValue({ period }),
        getPilotSystemHealth({ period: '24_hours' })
      ]);

      setOverview(overviewRes?.data);
      setAdoption(adoptionRes?.data);
      setClientQuality(qualityRes?.data);
      setValue(valueRes?.data);
      setSystemHealth(healthRes?.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load pilot metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-lg">Loading Founder Command Center...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                <Target className="w-8 h-8 text-blue-400" />
                Founder Command Center
              </h1>
              <p className="text-slate-400 mt-1 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDate()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-slate-700/50 border border-slate-600 text-white rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {PERIOD_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="p-2 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 text-slate-300 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <HeroCard
            icon={<Users className="w-6 h-6" />}
            label="Total Agents"
            value={overview?.agents?.total || 0}
            subtitle={`${overview?.agents?.activeWeek || 0} active this week`}
            trend={overview?.agents?.activePercent}
            color="blue"
          />
          <HeroCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Total Clients"
            value={overview?.clients?.total?.toLocaleString() || 0}
            subtitle={`+${overview?.clients?.newThisPeriod || 0} this period`}
            color="green"
          />
          <HeroCard
            icon={<AlertTriangle className="w-6 h-6" />}
            label="At-Risk Clients"
            value={overview?.clients?.atRisk || 0}
            subtitle={`${overview?.clients?.atRiskPercent || 0}% of total`}
            trend={overview?.clients?.atRiskChange}
            trendInverse
            color="amber"
          />
          <HeroCard
            icon={<Shield className="w-6 h-6" />}
            label="Clients Saved"
            value={overview?.clients?.saved || 0}
            subtitle={`${overview?.clients?.churned || 0} churned`}
            color="emerald"
          />
          <HeroCard
            icon={<DollarSign className="w-6 h-6" />}
            label="Revenue Saved"
            value={formatCurrency(overview?.revenue?.estimatedSaved || 0)}
            subtitle="Estimated this period"
            color="violet"
            large
          />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Agent Adoption Funnel */}
          <SectionCard
            title="Agent Adoption Funnel"
            icon={<Users className="w-5 h-5 text-blue-400" />}
            onClick={() => navigate('/founder/adoption')}
          >
            <div className="space-y-3">
              {adoption?.funnel && Object.entries(adoption.funnel).map(([key, data], idx) => (
                <FunnelRow
                  key={key}
                  label={formatFunnelLabel(key)}
                  count={data.count}
                  percent={data.percent}
                  total={adoption.funnel.signedUp?.count || 1}
                  index={idx}
                />
              ))}
            </div>
          </SectionCard>

          {/* Client Data Quality */}
          <SectionCard
            title="Client Data Quality"
            icon={<BarChart3 className="w-5 h-5 text-emerald-400" />}
            onClick={() => navigate('/founder/client-quality')}
          >
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Overall Score</span>
                <span className="text-2xl font-bold text-white">{clientQuality?.overallScore || 0}%</span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${clientQuality?.overallScore || 0}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {clientQuality?.fields && Object.entries(clientQuality.fields).slice(0, 6).map(([key, data]) => (
                <QualityRow
                  key={key}
                  label={formatQualityLabel(key)}
                  percent={data.percent}
                  count={data.count}
                />
              ))}
            </div>
          </SectionCard>

          {/* Value Delivery */}
          <SectionCard
            title="Value Delivery"
            icon={<Zap className="w-5 h-5 text-amber-400" />}
            onClick={() => navigate('/founder/value')}
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-700/30 rounded-xl p-4">
                <div className="text-3xl font-bold text-white">{value?.riskAlerts?.generated || 0}</div>
                <div className="text-sm text-slate-400">Risk Alerts ({period.replace('_', ' ')})</div>
                <div className="mt-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400">{value?.riskAlerts?.actedOnPercent || 0}% acted on</span>
                </div>
              </div>
              <div className="bg-slate-700/30 rounded-xl p-4">
                <div className="text-3xl font-bold text-white">{value?.automations?.sent || 0}</div>
                <div className="text-sm text-slate-400">Automations Sent</div>
                <div className="mt-2 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-400">{value?.automations?.deliveryRate || 0}% delivered</span>
                </div>
              </div>
            </div>
            {value?.riskAlerts?.avgTimeToActionHours && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Clock className="w-4 h-4" />
                Avg time to action: <span className="text-white font-medium">{value.riskAlerts.avgTimeToActionHours} hours</span>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-sm text-slate-400">Saved: {value?.retention?.saved || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm text-slate-400">Churned: {value?.retention?.churned || 0}</span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* System Health */}
          <SectionCard
            title="System Health"
            icon={<Activity className="w-5 h-5 text-cyan-400" />}
            onClick={() => navigate('/founder/system-health')}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full ${systemHealth?.status === 'operational' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className={`text-lg font-medium ${systemHealth?.status === 'operational' ? 'text-emerald-400' : 'text-red-400'}`}>
                {systemHealth?.status === 'operational' ? 'All Systems Operational' : 'Issues Detected'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <HealthMetric
                label="API Uptime"
                value={`${systemHealth?.api?.uptime || 99.9}%`}
                status={systemHealth?.api?.uptime >= 99 ? 'good' : 'warning'}
              />
              <HealthMetric
                label="Avg Response"
                value={`${systemHealth?.api?.avgResponseTime || 0}ms`}
                status={systemHealth?.api?.avgResponseTime < 500 ? 'good' : 'warning'}
              />
              <HealthMetric
                label="SMS Delivery"
                value={`${systemHealth?.sms?.deliveryRate || 0}%`}
                status={systemHealth?.sms?.deliveryRate >= 90 ? 'good' : 'warning'}
              />
              <HealthMetric
                label="Email Delivery"
                value={`${systemHealth?.email?.deliveryRate || 0}%`}
                status={systemHealth?.email?.deliveryRate >= 90 ? 'good' : 'warning'}
              />
            </div>
            {systemHealth?.errors?.total > 0 && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">{systemHealth.errors.total} errors in last 24 hours</span>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Weekly Trend Chart Placeholder */}
        <SectionCard
          title="Weekly Activity Trends"
          icon={<BarChart3 className="w-5 h-5 text-violet-400" />}
          fullWidth
        >
          <div className="h-48 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Trend charts will populate as data accumulates</p>
            </div>
          </div>
        </SectionCard>
      </main>
    </div>
  );
}

// Hero Card Component
function HeroCard({ icon, label, value, subtitle, trend, trendInverse, color, large }) {
  const colorStyles = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/30'
  };

  const iconColors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    violet: 'text-violet-400'
  };

  const getTrendIcon = () => {
    if (trend === undefined || trend === null) return null;
    const isPositive = trendInverse ? trend < 0 : trend > 0;
    if (trend === 0) return <Minus className="w-4 h-4 text-slate-400" />;
    if (isPositive) return <ArrowUpRight className="w-4 h-4 text-emerald-400" />;
    return <ArrowDownRight className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className={`bg-gradient-to-br ${colorStyles[color]} border rounded-2xl p-4 ${large ? 'col-span-2 lg:col-span-1' : ''}`}>
      <div className={`${iconColors[color]} mb-3`}>{icon}</div>
      <div className="text-sm text-slate-400 mb-1">{label}</div>
      <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{value}</div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">{subtitle}</span>
        {getTrendIcon()}
        {trend !== undefined && trend !== null && trend !== 0 && (
          <span className={`text-xs ${(trendInverse ? trend < 0 : trend > 0) ? 'text-emerald-400' : 'text-red-400'}`}>
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}

// Section Card Component
function SectionCard({ title, icon, children, onClick, fullWidth }) {
  return (
    <div className={`bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden ${fullWidth ? 'lg:col-span-2' : ''}`}>
      <div
        className={`flex items-center justify-between p-4 border-b border-slate-700/50 ${onClick ? 'cursor-pointer hover:bg-slate-700/30 transition-colors' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        {onClick && <ChevronRight className="w-5 h-5 text-slate-400" />}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// Funnel Row Component
function FunnelRow({ label, count, percent, total, index }) {
  const width = total > 0 ? (count / total) * 100 : 0;
  const colors = [
    'from-blue-500 to-blue-400',
    'from-cyan-500 to-cyan-400',
    'from-teal-500 to-teal-400',
    'from-emerald-500 to-emerald-400',
    'from-green-500 to-green-400',
    'from-lime-500 to-lime-400',
    'from-yellow-500 to-yellow-400',
    'from-amber-500 to-amber-400'
  ];

  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-sm text-slate-400 truncate">{label}</div>
      <div className="flex-1 h-6 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${colors[index % colors.length]} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
          style={{ width: `${Math.max(width, 10)}%` }}
        >
          <span className="text-xs font-medium text-white drop-shadow">{count}</span>
        </div>
      </div>
      <div className="w-12 text-right text-sm text-slate-400">{percent}%</div>
    </div>
  );
}

// Quality Row Component
function QualityRow({ label, percent, count }) {
  return (
    <div className="bg-slate-700/30 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-sm font-medium text-white">{percent}%</span>
      </div>
      <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            percent >= 70 ? 'bg-emerald-500' : percent >= 40 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// Health Metric Component
function HealthMetric({ label, value, status }) {
  const statusColors = {
    good: 'text-emerald-400',
    warning: 'text-amber-400',
    error: 'text-red-400'
  };

  return (
    <div className="bg-slate-700/30 rounded-lg p-3">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-lg font-bold ${statusColors[status]}`}>{value}</div>
    </div>
  );
}

// Helper functions
function formatFunnelLabel(key) {
  const labels = {
    signedUp: 'Signed Up',
    onboarded: 'Onboarded',
    smsConnected: 'SMS Connected',
    emailConnected: 'Email Connected',
    calendarConnected: 'Calendar Sync',
    importedClients: 'Imported Clients',
    usedPdfParser: 'Used PDF Parser',
    bluebuttonConnected: 'Blue Button'
  };
  return labels[key] || key;
}

function formatQualityLabel(key) {
  const labels = {
    profileComplete: 'Profile >80%',
    bluebutton: 'Blue Button',
    medications: 'Medications',
    planInfo: 'Plan Info',
    phone: 'Phone',
    email: 'Email',
    dob: 'Date of Birth',
    medicareId: 'Medicare ID',
    communications: 'Has Comms'
  };
  return labels[key] || key;
}
