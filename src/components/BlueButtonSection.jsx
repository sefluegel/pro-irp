// src/components/BlueButtonSection.jsx
// Blue Button 2.0 Medicare data integration component
import React, { useState, useEffect } from 'react';
import {
  getBlueButtonStatus,
  getBlueButtonAuthUrl,
  disconnectBlueButton,
  syncBlueButtonData,
  getBlueButtonClaims,
  getBlueButtonChanges,
  reviewPrescriptionChange
} from '../api';

export default function BlueButtonSection({ clientId, clientName }) {
  const [status, setStatus] = useState(null);
  const [claims, setClaims] = useState([]);
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [showClaims, setShowClaims] = useState(false);

  useEffect(() => {
    loadStatus();
  }, [clientId]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getBlueButtonStatus(clientId);
      setStatus(result);

      if (result.connected) {
        // Load claims and changes if connected
        const [claimsData, changesData] = await Promise.all([
          getBlueButtonClaims(clientId, 10),
          getBlueButtonChanges(clientId, 5)
        ]);
        setClaims(claimsData.claims || []);
        setChanges(changesData.changes || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setError(null);
      const result = await getBlueButtonAuthUrl(clientId);
      if (result.ok && result.authUrl) {
        // Open Medicare.gov authorization in new window
        window.open(result.authUrl, '_blank', 'width=600,height=700');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      setError(null);
      await disconnectBlueButton(clientId);
      setShowDisconnectConfirm(false);
      await loadStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      const result = await syncBlueButtonData(clientId);
      await loadStatus();
      alert(`Sync complete! Found ${result.newClaims} new claims and ${result.changesDetected} changes.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleReviewChange = async (changeId) => {
    try {
      await reviewPrescriptionChange(changeId);
      setChanges(changes.map(c =>
        c.id === changeId ? { ...c, reviewed_at: new Date().toISOString() } : c
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatCurrency = (cents) => {
    if (!cents) return '-';
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Medicare Blue Button</h3>
              <p className="text-sm text-gray-500">Prescription claims data from CMS</p>
            </div>
          </div>

          {/* Status Badge */}
          {status?.connected ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
              Not Connected
            </span>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {!status?.connected ? (
          /* Not Connected State */
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Connect Medicare Data</h4>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Link {clientName}'s Medicare account to automatically receive prescription data for risk assessment.
            </p>
            <button
              onClick={handleConnect}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Connect Blue Button
            </button>
            <p className="text-xs text-gray-400 mt-4">
              Client will authorize access via Medicare.gov
            </p>
          </div>
        ) : (
          /* Connected State */
          <div className="space-y-6">
            {/* Connection Info */}
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-500">
                Last synced: {status.lastSync ? formatDate(status.lastSync) : 'Never'}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {syncing ? (
                    <>
                      <svg className="animate-spin w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Syncing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Sync Now
                    </>
                  )}
                </button>
                {!showDisconnectConfirm ? (
                  <button
                    onClick={() => setShowDisconnectConfirm(true)}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Disconnect
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Are you sure?</span>
                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {disconnecting ? 'Disconnecting...' : 'Yes, Disconnect'}
                    </button>
                    <button
                      onClick={() => setShowDisconnectConfirm(false)}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Prescription Changes (Alerts) */}
            {changes.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Changes</h4>
                <div className="space-y-2">
                  {changes.map((change) => (
                    <div
                      key={change.id}
                      className={`p-3 rounded-lg border ${
                        change.reviewed_at
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              change.change_type === 'new_medication' ? 'bg-blue-100 text-blue-800' :
                              change.change_type === 'discontinued' ? 'bg-red-100 text-red-800' :
                              change.change_type === 'new_prescriber' ? 'bg-purple-100 text-purple-800' :
                              change.change_type === 'adherence_gap' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {change.change_type.replace(/_/g, ' ')}
                            </span>
                            {!change.reviewed_at && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                New
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-medium text-gray-900">{change.drug_name}</p>
                          <p className="text-xs text-gray-500">{formatDate(change.detected_at)}</p>
                        </div>
                        {!change.reviewed_at && (
                          <button
                            onClick={() => handleReviewChange(change.id)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Mark Reviewed
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Claims Toggle */}
            <div>
              <button
                onClick={() => setShowClaims(!showClaims)}
                className="flex items-center justify-between w-full text-left"
              >
                <h4 className="text-sm font-semibold text-gray-700">
                  Recent Prescriptions ({claims.length})
                </h4>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${showClaims ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showClaims && claims.length > 0 && (
                <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Drug</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fill Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {claims.map((claim) => (
                        <tr key={claim.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">{claim.drug_name}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{formatDate(claim.fill_date)}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{claim.quantity || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{formatCurrency(claim.patient_pay_cents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {showClaims && claims.length === 0 && (
                <p className="mt-3 text-sm text-gray-500 italic">No prescription claims found yet. Try syncing.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
