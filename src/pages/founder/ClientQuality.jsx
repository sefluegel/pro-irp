// src/pages/founder/ClientQuality.jsx
// Level 2: Client Data Quality Detail Page

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Phone,
  Mail,
  Calendar,
  Shield,
  Pill,
  FileText,
  MessageSquare,
  ChevronRight,
  Search,
  Download,
  ExternalLink
} from "lucide-react";
import { getPilotClientQuality, getPilotClientQualityDetail, getPilotClientQualityByAgent } from "../../api";

const QUALITY_FIELDS = [
  { key: 'profileComplete', label: 'Profile >80% Complete', icon: User, color: 'blue' },
  { key: 'bluebutton', label: 'Blue Button Connected', icon: Shield, color: 'emerald' },
  { key: 'medications', label: 'Medications Entered', icon: Pill, color: 'purple' },
  { key: 'planInfo', label: 'Plan Info Complete', icon: FileText, color: 'cyan' },
  { key: 'phone', label: 'Has Phone Number', icon: Phone, color: 'green' },
  { key: 'email', label: 'Has Email Address', icon: Mail, color: 'amber' },
  { key: 'dob', label: 'Has Date of Birth', icon: Calendar, color: 'orange' },
  { key: 'medicareId', label: 'Has Medicare ID', icon: FileText, color: 'red' },
  { key: 'communications', label: 'Has Communication Log', icon: MessageSquare, color: 'indigo' }
];

export default function ClientQuality() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [fieldDetail, setFieldDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showMissing, setShowMissing] = useState(true);
  const [agentData, setAgentData] = useState(null);
  const [activeTab, setActiveTab] = useState('fields');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedField) {
      loadFieldDetail(selectedField, showMissing ? 'missing' : 'has');
    }
  }, [selectedField, showMissing]);

  const loadData = async () => {
    try {
      const [qualityRes, agentRes] = await Promise.all([
        getPilotClientQuality(),
        getPilotClientQualityByAgent()
      ]);
      setData(qualityRes?.data);
      setAgentData(agentRes?.data);
    } catch (err) {
      console.error('Failed to load quality data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFieldDetail = async (field, status) => {
    setDetailLoading(true);
    try {
      const res = await getPilotClientQualityDetail(field, { status, limit: 50 });
      setFieldDetail(res?.data);
    } catch (err) {
      console.error('Failed to load field detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
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
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Client Data Quality</h1>
              <p className="text-slate-400">Analyze data completeness across all clients</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Overall Score */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Overall Data Quality Score</h2>
              <p className="text-slate-400">Average completeness across {data?.total?.toLocaleString() || 0} clients</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    className="text-slate-700"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    strokeDasharray={`${(data?.overallScore || 0) * 3.52} 352`}
                    strokeLinecap="round"
                    className={`${
                      data?.overallScore >= 70 ? 'text-emerald-500' :
                      data?.overallScore >= 40 ? 'text-amber-500' : 'text-red-500'
                    }`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{data?.overallScore || 0}%</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-sm text-slate-400">Good (70%+)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-sm text-slate-400">Needs Work (40-69%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm text-slate-400">Poor (&lt;40%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('fields')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'fields' ? 'bg-emerald-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
            }`}
          >
            By Field
          </button>
          <button
            onClick={() => setActiveTab('agents')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'agents' ? 'bg-emerald-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
            }`}
          >
            By Agent
          </button>
        </div>

        {/* Field Breakdown */}
        {activeTab === 'fields' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Field List */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-700/50">
                <h3 className="text-lg font-semibold text-white">Data Fields</h3>
              </div>
              <div className="divide-y divide-slate-700/50">
                {QUALITY_FIELDS.map(field => {
                  const fieldData = data?.fields?.[field.key];
                  const percent = fieldData?.percent || 0;

                  return (
                    <div
                      key={field.key}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedField === field.key ? 'bg-slate-700/50' : 'hover:bg-slate-700/30'
                      }`}
                      onClick={() => setSelectedField(field.key)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl bg-${field.color}-500/20 flex items-center justify-center`}>
                          <field.icon className={`w-5 h-5 text-${field.color}-400`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium">{field.label}</span>
                            <span className={`text-sm font-bold ${
                              percent >= 70 ? 'text-emerald-400' :
                              percent >= 40 ? 'text-amber-400' : 'text-red-400'
                            }`}>{percent}%</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  percent >= 70 ? 'bg-emerald-500' :
                                  percent >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400">
                              {fieldData?.count?.toLocaleString() || 0} / {data?.total?.toLocaleString() || 0}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Field Detail */}
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden">
              {!selectedField ? (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="text-center text-slate-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Select a field to see details</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 border-b border-slate-700/50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">
                        {QUALITY_FIELDS.find(f => f.key === selectedField)?.label}
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowMissing(true)}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            showMissing ? 'bg-red-500/20 text-red-400' : 'bg-slate-700/50 text-slate-400'
                          }`}
                        >
                          Missing
                        </button>
                        <button
                          onClick={() => setShowMissing(false)}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            !showMissing ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-400'
                          }`}
                        >
                          Has Data
                        </button>
                      </div>
                    </div>
                  </div>
                  {detailLoading ? (
                    <div className="p-8 text-center">
                      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="text-sm text-slate-400 mb-4">
                        {showMissing ? 'Clients missing this data' : 'Clients with this data'}: {fieldDetail?.total?.toLocaleString() || 0}
                      </div>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {fieldDetail?.clients?.map(client => (
                          <div
                            key={client.id}
                            className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between hover:bg-slate-700/50 cursor-pointer"
                            onClick={() => navigate(`/clients/${client.id}`)}
                          >
                            <div>
                              <div className="text-white font-medium">{client.name || 'Unknown'}</div>
                              <div className="text-xs text-slate-400">
                                {client.email || client.phone || 'No contact info'}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {client.riskScore !== null && (
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  client.riskScore >= 60 ? 'bg-red-500/20 text-red-400' :
                                  client.riskScore >= 30 ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                  Risk: {client.riskScore}
                                </span>
                              )}
                              <ExternalLink className="w-4 h-4 text-slate-400" />
                            </div>
                          </div>
                        ))}
                        {(!fieldDetail?.clients || fieldDetail.clients.length === 0) && (
                          <div className="text-center text-slate-500 py-8">
                            No clients found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Agent Breakdown */}
        {activeTab === 'agents' && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700/50">
              <h3 className="text-lg font-semibold text-white">Data Quality by Agent</h3>
              <p className="text-sm text-slate-400">Agents with lowest completion rates need attention</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Agent</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Clients</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Avg Completeness</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Complete Profiles</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {agentData?.agents?.map(agent => (
                    <tr key={agent.id} className="hover:bg-slate-700/20">
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{agent.name}</div>
                        <div className="text-xs text-slate-400">{agent.email}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-white">{agent.totalClients}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                agent.avgCompleteness >= 70 ? 'bg-emerald-500' :
                                agent.avgCompleteness >= 40 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${agent.avgCompleteness}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${
                            agent.avgCompleteness >= 70 ? 'text-emerald-400' :
                            agent.avgCompleteness >= 40 ? 'text-amber-400' : 'text-red-400'
                          }`}>{agent.avgCompleteness}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-300">{agent.completeProfiles}</td>
                      <td className="px-4 py-3 text-center">
                        {agent.avgCompleteness < 50 && (
                          <button className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-xs hover:bg-amber-500/30">
                            Send Reminder
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Recommendations</h3>
              <ul className="space-y-2 text-slate-300">
                {data?.fields?.bluebutton?.percent < 30 && (
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                    {data?.total - (data?.fields?.bluebutton?.count || 0)} clients don't have Blue Button connected - this limits risk prediction accuracy
                  </li>
                )}
                {data?.fields?.medications?.percent < 50 && (
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                    {data?.total - (data?.fields?.medications?.count || 0)} clients are missing medication data - critical for plan recommendations
                  </li>
                )}
                {data?.overallScore < 60 && (
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                    Consider running a data completion campaign to improve overall quality
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
