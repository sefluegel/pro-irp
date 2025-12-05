// CRMIntegrations.jsx - CRM Integration UI (Go High Level, Salesforce)
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Database,
  Users,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Plug,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  Settings2,
  Play,
  History
} from 'lucide-react';
import {
  getCRMIntegrations,
  getCRMIntegration,
  connectCRM,
  disconnectCRM,
  triggerCRMSync,
  getCRMSyncHistory
} from '../api';

export default function CRMIntegrations() {
  const { t } = useTranslation();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null);
  const [expandedIntegration, setExpandedIntegration] = useState(null);
  const [syncHistory, setSyncHistory] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCRMIntegrations();
      setIntegrations(data.integrations || []);
    } catch (err) {
      console.error('Failed to load CRM integrations:', err);
      setError('Failed to load CRM integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (crmType) => {
    try {
      const data = await connectCRM(crmType);
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err) {
      console.error(`Failed to connect ${crmType}:`, err);
      alert(`Failed to connect ${crmType}. Please try again.`);
    }
  };

  const handleDisconnect = async (integrationId, crmType) => {
    if (!window.confirm(`Are you sure you want to disconnect your ${crmType === 'gohighlevel' ? 'Go High Level' : 'Salesforce'} integration? This will stop automatic syncing.`)) {
      return;
    }

    try {
      await disconnectCRM(integrationId);
      await loadIntegrations();
    } catch (err) {
      console.error(`Failed to disconnect ${crmType}:`, err);
      alert(`Failed to disconnect. Please try again.`);
    }
  };

  const handleSync = async (integrationId, fullSync = false) => {
    setSyncing(integrationId);
    try {
      const result = await triggerCRMSync(integrationId, fullSync);
      alert(`Sync ${result.sync?.status === 'completed' ? 'completed successfully' : 'started'}! ${result.sync?.records_created || 0} new clients imported.`);
      await loadIntegrations();
      if (expandedIntegration === integrationId) {
        await loadSyncHistory(integrationId);
      }
    } catch (err) {
      console.error('Sync failed:', err);
      alert(`Sync failed: ${err.message || 'Unknown error'}`);
    } finally {
      setSyncing(null);
    }
  };

  const loadSyncHistory = async (integrationId) => {
    try {
      const data = await getCRMSyncHistory(integrationId);
      setSyncHistory(prev => ({ ...prev, [integrationId]: data.history || [] }));
    } catch (err) {
      console.error('Failed to load sync history:', err);
    }
  };

  const toggleExpanded = async (integrationId) => {
    if (expandedIntegration === integrationId) {
      setExpandedIntegration(null);
    } else {
      setExpandedIntegration(integrationId);
      if (!syncHistory[integrationId]) {
        await loadSyncHistory(integrationId);
      }
    }
  };

  const ghlIntegration = integrations.find(i => i.crm_type === 'gohighlevel');
  const sfIntegration = integrations.find(i => i.crm_type === 'salesforce');

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'partial': return 'text-yellow-600 bg-yellow-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin text-[#FFB800]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-8">
      {/* Section Header */}
      <div className="border-t-2 border-gray-200 pt-8">
        <div className="flex items-center gap-3 mb-2">
          <Database className="text-purple-600" size={28} />
          <h2 className="text-2xl font-extrabold text-[#172A3A]">CRM Integrations</h2>
        </div>
        <p className="text-gray-600 mb-6">
          Connect your existing CRM to automatically import and sync your clients with PRO IRP.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-2">
          <AlertTriangle size={20} />
          {error}
        </div>
      )}

      {/* Go High Level Card */}
      <div className={`bg-white rounded-2xl shadow-lg p-6 border-2 transition-all ${ghlIntegration?.has_access_token ? 'border-green-500' : 'border-gray-200'}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
              <span className="text-white text-2xl font-bold">GHL</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#172A3A] flex items-center gap-2">
                Go High Level
                {ghlIntegration?.has_access_token && <CheckCircle2 className="text-green-600" size={20} />}
              </h3>
              <p className="text-gray-600 text-sm">Sync contacts, tags, and custom fields</p>
            </div>
          </div>
          <div>
            {ghlIntegration?.has_access_token ? (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold text-sm">
                <CheckCircle2 size={16} />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm">
                <XCircle size={16} />
                Not Connected
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <Users className="text-orange-600 mt-1" size={18} />
            <div>
              <div className="font-semibold text-[#172A3A]">Contact Import</div>
              <div className="text-sm text-gray-600">
                Import all your GHL contacts with their profiles, tags, and custom fields
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ArrowRightLeft className="text-orange-600 mt-1" size={18} />
            <div>
              <div className="font-semibold text-[#172A3A]">Real-time Sync</div>
              <div className="text-sm text-gray-600">
                Keep clients in sync with webhooks - new contacts auto-imported
              </div>
            </div>
          </div>
        </div>

        {ghlIntegration?.has_access_token ? (
          <>
            {/* Connected State Actions */}
            <div className="flex items-center gap-3 pt-4 border-t flex-wrap">
              <button
                onClick={() => handleSync(ghlIntegration.id, false)}
                disabled={syncing === ghlIntegration.id}
                className="flex items-center gap-2 bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 py-2 font-bold rounded-lg transition disabled:opacity-50"
              >
                {syncing === ghlIntegration.id ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <Play size={18} />
                )}
                Sync Now
              </button>
              <button
                onClick={() => handleSync(ghlIntegration.id, true)}
                disabled={syncing === ghlIntegration.id}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 font-bold rounded-lg transition disabled:opacity-50"
              >
                <RefreshCw size={18} />
                Full Sync
              </button>
              <button
                onClick={() => toggleExpanded(ghlIntegration.id)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 px-3 py-2 transition"
              >
                <History size={18} />
                History
                {expandedIntegration === ghlIntegration.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <div className="flex-1" />
              <button
                onClick={() => handleDisconnect(ghlIntegration.id, 'gohighlevel')}
                className="text-red-600 hover:text-red-700 px-3 py-2 font-semibold transition"
              >
                Disconnect
              </button>
            </div>

            {/* Last Sync Info */}
            {ghlIntegration.last_sync_at && (
              <div className="mt-3 text-sm text-gray-500 flex items-center gap-2">
                <Clock size={14} />
                Last synced: {formatDate(ghlIntegration.last_sync_at)}
                {ghlIntegration.last_sync_status && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(ghlIntegration.last_sync_status)}`}>
                    {ghlIntegration.last_sync_status}
                  </span>
                )}
              </div>
            )}

            {/* Expanded Sync History */}
            {expandedIntegration === ghlIntegration.id && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-semibold text-[#172A3A] mb-3">Sync History</h4>
                {syncHistory[ghlIntegration.id]?.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {syncHistory[ghlIntegration.id].map((sync, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg text-sm">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded font-medium ${getStatusColor(sync.status)}`}>
                            {sync.status}
                          </span>
                          <span className="text-gray-600">
                            {sync.records_created} created, {sync.records_updated} updated
                          </span>
                        </div>
                        <span className="text-gray-500">{formatDate(sync.started_at)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No sync history yet</p>
                )}
              </div>
            )}
          </>
        ) : (
          <button
            onClick={() => handleConnect('gohighlevel')}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 font-bold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <Plug size={20} />
            Connect Go High Level
          </button>
        )}
      </div>

      {/* Salesforce Card */}
      <div className={`bg-white rounded-2xl shadow-lg p-6 border-2 transition-all ${sfIntegration?.has_access_token ? 'border-green-500' : 'border-gray-200'}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg"
                className="w-10 h-10 object-contain"
                alt="Salesforce"
                onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<span class="text-white text-xl font-bold">SF</span>'; }}
              />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#172A3A] flex items-center gap-2">
                Salesforce
                {sfIntegration?.has_access_token && <CheckCircle2 className="text-green-600" size={20} />}
              </h3>
              <p className="text-gray-600 text-sm">Sync contacts, accounts, and opportunities</p>
            </div>
          </div>
          <div>
            {sfIntegration?.has_access_token ? (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold text-sm">
                <CheckCircle2 size={16} />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm">
                <XCircle size={16} />
                Not Connected
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <Users className="text-blue-600 mt-1" size={18} />
            <div>
              <div className="font-semibold text-[#172A3A]">Contact Import</div>
              <div className="text-sm text-gray-600">
                Import Salesforce contacts with all their profile data
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ArrowRightLeft className="text-blue-600 mt-1" size={18} />
            <div>
              <div className="font-semibold text-[#172A3A]">Bi-directional Sync</div>
              <div className="text-sm text-gray-600">
                Changes sync both ways between Salesforce and PRO IRP
              </div>
            </div>
          </div>
        </div>

        {sfIntegration?.has_access_token ? (
          <>
            {/* Connected State Actions */}
            <div className="flex items-center gap-3 pt-4 border-t flex-wrap">
              <button
                onClick={() => handleSync(sfIntegration.id, false)}
                disabled={syncing === sfIntegration.id}
                className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 font-bold rounded-lg transition disabled:opacity-50"
              >
                {syncing === sfIntegration.id ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <Play size={18} />
                )}
                Sync Now
              </button>
              <button
                onClick={() => handleSync(sfIntegration.id, true)}
                disabled={syncing === sfIntegration.id}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 font-bold rounded-lg transition disabled:opacity-50"
              >
                <RefreshCw size={18} />
                Full Sync
              </button>
              <button
                onClick={() => toggleExpanded(sfIntegration.id)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 px-3 py-2 transition"
              >
                <History size={18} />
                History
                {expandedIntegration === sfIntegration.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <div className="flex-1" />
              <button
                onClick={() => handleDisconnect(sfIntegration.id, 'salesforce')}
                className="text-red-600 hover:text-red-700 px-3 py-2 font-semibold transition"
              >
                Disconnect
              </button>
            </div>

            {/* Last Sync Info */}
            {sfIntegration.last_sync_at && (
              <div className="mt-3 text-sm text-gray-500 flex items-center gap-2">
                <Clock size={14} />
                Last synced: {formatDate(sfIntegration.last_sync_at)}
                {sfIntegration.last_sync_status && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(sfIntegration.last_sync_status)}`}>
                    {sfIntegration.last_sync_status}
                  </span>
                )}
              </div>
            )}

            {/* Expanded Sync History */}
            {expandedIntegration === sfIntegration.id && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-semibold text-[#172A3A] mb-3">Sync History</h4>
                {syncHistory[sfIntegration.id]?.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {syncHistory[sfIntegration.id].map((sync, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg text-sm">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded font-medium ${getStatusColor(sync.status)}`}>
                            {sync.status}
                          </span>
                          <span className="text-gray-600">
                            {sync.records_created} created, {sync.records_updated} updated
                          </span>
                        </div>
                        <span className="text-gray-500">{formatDate(sync.started_at)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No sync history yet</p>
                )}
              </div>
            )}
          </>
        ) : (
          <button
            onClick={() => handleConnect('salesforce')}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 font-bold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <Plug size={20} />
            Connect Salesforce
          </button>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
        <div className="flex gap-4">
          <div className="text-purple-600 mt-1">
            <Database size={24} />
          </div>
          <div>
            <h4 className="font-bold text-purple-900 mb-2">Why Connect Your CRM?</h4>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>Import existing clients automatically - no manual data entry</li>
              <li>Keep client data synchronized in real-time</li>
              <li>Preserve tags, custom fields, and communication history</li>
              <li>Use MCP protocol for secure, standardized integration</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
