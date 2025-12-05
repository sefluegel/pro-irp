// src/pages/founder/AgentAdoption.jsx
// Level 2: Agent Adoption Detail Page

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  MessageSquare,
  Calendar,
  FileUp,
  FileText,
  Shield,
  ChevronRight,
  Search,
  Download
} from "lucide-react";
import { getPilotAdoption, getPilotAdoptionDetail } from "../../api";

const MILESTONES = [
  { key: 'onboarding', label: 'Completed Onboarding', icon: CheckCircle2, color: 'blue' },
  { key: 'sms', label: 'Connected SMS', icon: MessageSquare, color: 'green' },
  { key: 'email', label: 'Connected Email', icon: Mail, color: 'purple' },
  { key: 'calendar', label: 'Synced Calendar', icon: Calendar, color: 'cyan' },
  { key: 'import', label: 'Imported Clients', icon: FileUp, color: 'amber' },
  { key: 'pdf-parser', label: 'Used PDF Parser', icon: FileText, color: 'orange' },
  { key: 'bluebutton', label: 'Connected Blue Button', icon: Shield, color: 'emerald' }
];

export default function AgentAdoption() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [milestoneDetail, setMilestoneDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedMilestone) {
      loadMilestoneDetail(selectedMilestone);
    }
  }, [selectedMilestone]);

  const loadData = async () => {
    try {
      const res = await getPilotAdoption();
      setData(res?.data);
    } catch (err) {
      console.error('Failed to load adoption data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMilestoneDetail = async (milestone) => {
    setDetailLoading(true);
    try {
      const res = await getPilotAdoptionDetail(milestone);
      setMilestoneDetail(res?.data);
    } catch (err) {
      console.error('Failed to load milestone detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredAgents = data?.agents?.filter(agent =>
    agent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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
            <Users className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Agent Adoption</h1>
              <p className="text-slate-400">Track onboarding progress and feature adoption</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Funnel Overview */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Onboarding Funnel</h2>
          <div className="space-y-4">
            {data?.funnel && (
              <>
                <FunnelStep
                  label="Signed Up"
                  count={data.funnel.signedUp?.count || 0}
                  percent={100}
                  total={data.funnel.signedUp?.count || 1}
                  color="from-blue-500 to-blue-400"
                />
                {MILESTONES.map((milestone, idx) => {
                  const funnelKey = milestone.key === 'pdf-parser' ? 'usedPdfParser' :
                    milestone.key === 'bluebutton' ? 'bluebuttonConnected' :
                    milestone.key + (milestone.key === 'import' ? 'edClients' : 'Connected');
                  const stepData = data.funnel[funnelKey] || { count: 0, percent: 0 };

                  return (
                    <FunnelStep
                      key={milestone.key}
                      label={milestone.label}
                      count={stepData.count}
                      percent={stepData.percent}
                      total={data.funnel.signedUp?.count || 1}
                      color={`from-${milestone.color}-500 to-${milestone.color}-400`}
                      onClick={() => setSelectedMilestone(milestone.key)}
                      selected={selectedMilestone === milestone.key}
                    />
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Milestone Detail Panel */}
        {selectedMilestone && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {MILESTONES.find(m => m.key === selectedMilestone)?.label} - Details
              </h3>
              <button
                onClick={() => setSelectedMilestone(null)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            {detailLoading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : milestoneDetail && (
              <div className="p-4">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Completed */}
                  <div>
                    <h4 className="text-sm font-medium text-emerald-400 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Completed ({milestoneDetail.completed?.count || 0})
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {milestoneDetail.completed?.agents?.map(agent => (
                        <div key={agent.id} className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <div className="text-white font-medium">{agent.name}</div>
                            <div className="text-xs text-slate-400">{agent.email}</div>
                          </div>
                          <div className="text-xs text-slate-500">
                            {agent.completed_at && new Date(agent.completed_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Not Completed */}
                  <div>
                    <h4 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Not Yet ({milestoneDetail.notCompleted?.count || 0})
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {milestoneDetail.notCompleted?.agents?.map(agent => (
                        <div key={agent.id} className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <div className="text-white font-medium">{agent.name}</div>
                            <div className="text-xs text-slate-400">{agent.email}</div>
                          </div>
                          <div className="text-xs text-slate-500">
                            Last login: {agent.last_login_at ? new Date(agent.last_login_at).toLocaleDateString() : 'Never'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Agent List */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">All Agents ({filteredAgents.length})</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search agents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button className="p-2 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 rounded-lg">
                <Download className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/30">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Agent</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Clients</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Progress</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Milestones</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredAgents.map(agent => (
                  <tr key={agent.id} className="hover:bg-slate-700/20">
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{agent.name}</div>
                      <div className="text-xs text-slate-400">{agent.email}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-white font-medium">{agent.clientCount}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(agent.completedSteps / 7) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">{agent.completedSteps}/7</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {MILESTONES.map(m => {
                          const key = m.key === 'pdf-parser' ? 'pdfParser' : m.key;
                          const completed = agent.milestones?.[key];
                          return (
                            <div
                              key={m.key}
                              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-500'
                              }`}
                              title={m.label}
                            >
                              <m.icon className="w-3 h-3" />
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-400">
                        {agent.lastLoginAt ? new Date(agent.lastLoginAt).toLocaleDateString() : 'Never'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function FunnelStep({ label, count, percent, total, color, onClick, selected }) {
  const width = total > 0 ? (count / total) * 100 : 0;

  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-xl transition-colors cursor-pointer ${
        selected ? 'bg-slate-700/50 ring-2 ring-blue-500' : 'hover:bg-slate-700/30'
      }`}
      onClick={onClick}
    >
      <div className="w-40 text-sm text-slate-300">{label}</div>
      <div className="flex-1 h-8 bg-slate-700/50 rounded-lg overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-lg flex items-center justify-end pr-3 transition-all duration-500`}
          style={{ width: `${Math.max(width, 8)}%` }}
        >
          <span className="text-sm font-bold text-white drop-shadow">{count}</span>
        </div>
      </div>
      <div className="w-16 text-right">
        <span className="text-sm font-medium text-white">{percent}%</span>
      </div>
      {onClick && <ChevronRight className="w-4 h-4 text-slate-400" />}
    </div>
  );
}
