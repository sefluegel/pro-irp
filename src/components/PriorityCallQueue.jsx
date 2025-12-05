// src/components/PriorityCallQueue.jsx
// Priority call queue widget ordered by risk score
import React, { useState, useEffect, useCallback } from 'react';
import { getPriorityQueue } from '../api';
import { Link } from 'react-router-dom';
import CallOutcomeModal from './CallOutcomeModal';

const RISK_CATEGORIES = {
  severe: { label: 'Severe', color: 'bg-red-600', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  critical: { label: 'Critical', color: 'bg-red-500', textColor: 'text-red-600', bgLight: 'bg-red-50' },
  high: { label: 'High', color: 'bg-orange-500', textColor: 'text-orange-600', bgLight: 'bg-orange-50' },
  elevated: { label: 'Elevated', color: 'bg-yellow-500', textColor: 'text-yellow-600', bgLight: 'bg-yellow-50' },
  moderate: { label: 'Moderate', color: 'bg-blue-500', textColor: 'text-blue-600', bgLight: 'bg-blue-50' },
  low: { label: 'Low', color: 'bg-green-500', textColor: 'text-green-600', bgLight: 'bg-green-50' },
  stable: { label: 'Stable', color: 'bg-green-600', textColor: 'text-green-700', bgLight: 'bg-green-50' }
};

export default function PriorityCallQueue({ limit = 10, showFilters = true }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, high, critical, severe
  const [selectedClient, setSelectedClient] = useState(null);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit };
      if (filter !== 'all') {
        params.minCategory = filter;
      }
      const data = await getPriorityQueue(params);
      setQueue(data.clients || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [limit, filter]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  function handleCallComplete(client) {
    setSelectedClient(client);
    setShowOutcomeModal(true);
  }

  function handleOutcomeSuccess() {
    loadQueue(); // Refresh the queue
  }

  if (loading && queue.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">Priority Call Queue</h2>
          </div>

          {showFilters && (
            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Clients</option>
                <option value="elevated">Elevated+</option>
                <option value="high">High+</option>
                <option value="critical">Critical+</option>
                <option value="severe">Severe Only</option>
              </select>
              <button
                onClick={loadQueue}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Refresh"
              >
                <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Queue List */}
        {error ? (
          <div className="p-6 text-center text-red-600">
            <p>Failed to load queue</p>
            <button onClick={loadQueue} className="mt-2 text-sm text-blue-600 hover:text-blue-700">
              Retry
            </button>
          </div>
        ) : queue.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No clients in queue</p>
            <p className="text-sm mt-1">Great job! All clients are in good standing.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {queue.map((client, idx) => {
              const category = RISK_CATEGORIES[client.risk_category] || RISK_CATEGORIES.moderate;

              return (
                <li
                  key={client.id}
                  className={`px-6 py-4 hover:bg-gray-50 transition-colors ${
                    idx === 0 ? 'bg-gradient-to-r from-red-50 to-transparent' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Priority Number */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        idx === 0 ? 'bg-red-600 text-white' :
                        idx < 3 ? 'bg-orange-500 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {idx + 1}
                      </div>

                      {/* Client Info */}
                      <div className="min-w-0">
                        <Link
                          to={`/clients/${client.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600 truncate block"
                        >
                          {client.first_name} {client.last_name}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${category.bgLight} ${category.textColor}`}>
                            {category.label}
                          </span>
                          {client.days_since_contact !== null && (
                            <span className={`text-xs ${
                              client.days_since_contact > 30 ? 'text-red-600' :
                              client.days_since_contact > 14 ? 'text-yellow-600' :
                              'text-gray-500'
                            }`}>
                              {client.days_since_contact === 0 ? 'Contacted today' :
                               client.days_since_contact === 1 ? '1 day ago' :
                               `${client.days_since_contact} days ago`}
                            </span>
                          )}
                          {client.sep_active && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                              SEP Active
                            </span>
                          )}
                        </div>
                        {client.top_risk_factor && (
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {client.top_risk_factor}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Score and Actions */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {/* Score Circle */}
                      <div className="text-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          client.risk_score >= 85 ? 'bg-red-100' :
                          client.risk_score >= 70 ? 'bg-orange-100' :
                          client.risk_score >= 55 ? 'bg-yellow-100' :
                          client.risk_score >= 40 ? 'bg-blue-100' :
                          'bg-green-100'
                        }`}>
                          <span className={`text-lg font-bold ${
                            client.risk_score >= 85 ? 'text-red-600' :
                            client.risk_score >= 70 ? 'text-orange-600' :
                            client.risk_score >= 55 ? 'text-yellow-600' :
                            client.risk_score >= 40 ? 'text-blue-600' :
                            'text-green-600'
                          }`}>
                            {client.risk_score}
                          </span>
                        </div>
                        {client.score_trend && (
                          <span className={`text-xs ${
                            client.score_trend > 0 ? 'text-red-500' : 'text-green-500'
                          }`}>
                            {client.score_trend > 0 ? '+' : ''}{client.score_trend}
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {client.phone && (
                          <a
                            href={`tel:${client.phone}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                            title={`Call ${client.phone}`}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </a>
                        )}
                        <button
                          onClick={() => handleCallComplete(client)}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                          Log Call
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer */}
        {queue.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <Link
              to="/clients?sort=risk_score&order=desc"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All Clients by Risk Score →
            </Link>
          </div>
        )}
      </div>

      {/* Call Outcome Modal */}
      <CallOutcomeModal
        isOpen={showOutcomeModal}
        onClose={() => {
          setShowOutcomeModal(false);
          setSelectedClient(null);
        }}
        client={selectedClient}
        onSuccess={handleOutcomeSuccess}
      />
    </>
  );
}
