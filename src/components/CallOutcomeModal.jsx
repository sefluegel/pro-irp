// src/components/CallOutcomeModal.jsx
// Modal for logging call outcomes with score adjustments
import React, { useState, useEffect } from 'react';
import { getCallOutcomeOptions, logCallOutcome } from '../api';

const CATEGORY_LABELS = {
  positive: { label: 'Positive Outcomes', color: 'bg-green-50 border-green-200', textColor: 'text-green-700' },
  neutral: { label: 'Neutral Outcomes', color: 'bg-gray-50 border-gray-200', textColor: 'text-gray-700' },
  concern: { label: 'Concerns Raised', color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-700' },
  negative: { label: 'Negative Outcomes', color: 'bg-red-50 border-red-200', textColor: 'text-red-700' }
};

export default function CallOutcomeModal({ isOpen, onClose, client, onSuccess }) {
  const [options, setOptions] = useState([]);
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      // Reset form
      setSelectedOutcome(null);
      setNotes('');
      setFollowUpDate('');
      setError(null);
    }
  }, [isOpen]);

  async function loadOptions() {
    setLoading(true);
    try {
      const data = await getCallOutcomeOptions();
      setOptions(data.options || []);
    } catch (err) {
      setError('Failed to load outcome options');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedOutcome) {
      setError('Please select an outcome');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await logCallOutcome({
        clientId: client.id,
        outcomeId: selectedOutcome.id,
        notes,
        followUpDate: followUpDate || null
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to log outcome');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  // Group options by category
  const groupedOptions = options.reduce((acc, opt) => {
    const cat = opt.category || 'neutral';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(opt);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Log Call Outcome</h2>
              {client && (
                <p className="text-sm text-gray-500 mt-1">
                  {client.first_name} {client.last_name}
                  {client.risk_score !== undefined && (
                    <span className="ml-2">
                      (Current Score: <span className={getRiskColor(client.risk_score)}>{client.risk_score}</span>)
                    </span>
                  )}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="px-6 py-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  {/* Outcome Categories */}
                  {['positive', 'neutral', 'concern', 'negative'].map(category => {
                    const categoryConfig = CATEGORY_LABELS[category];
                    const categoryOptions = groupedOptions[category] || [];

                    if (categoryOptions.length === 0) return null;

                    return (
                      <div key={category} className={`rounded-lg border p-4 ${categoryConfig.color}`}>
                        <h3 className={`font-medium mb-3 ${categoryConfig.textColor}`}>
                          {categoryConfig.label}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {categoryOptions.map(opt => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setSelectedOutcome(opt)}
                              className={`text-left p-3 rounded-md border transition-all ${
                                selectedOutcome?.id === opt.id
                                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <span className="font-medium text-sm text-gray-900">{opt.label}</span>
                                <span className={`text-xs font-mono ${
                                  opt.score_adjustment > 0 ? 'text-red-600' :
                                  opt.score_adjustment < 0 ? 'text-green-600' :
                                  'text-gray-500'
                                }`}>
                                  {opt.score_adjustment > 0 ? '+' : ''}{opt.score_adjustment}
                                </span>
                              </div>
                              {opt.description && (
                                <p className="text-xs text-gray-500 mt-1">{opt.description}</p>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Selected Outcome Preview */}
                  {selectedOutcome && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-900">Selected: {selectedOutcome.label}</p>
                          <p className="text-xs text-blue-700 mt-1">
                            Score will change by {selectedOutcome.score_adjustment > 0 ? '+' : ''}{selectedOutcome.score_adjustment} points
                          </p>
                        </div>
                        {client?.risk_score !== undefined && (
                          <div className="text-right">
                            <p className="text-xs text-blue-700">New Score</p>
                            <p className={`text-lg font-bold ${getRiskColor(client.risk_score + selectedOutcome.score_adjustment)}`}>
                              {Math.max(0, Math.min(100, client.risk_score + selectedOutcome.score_adjustment))}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      placeholder="Add any relevant notes about the call..."
                    />
                  </div>

                  {/* Follow-up Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Schedule Follow-up (optional)
                    </label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                      {error}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedOutcome || submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : 'Log Outcome'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function getRiskColor(score) {
  if (score >= 85) return 'text-red-600';
  if (score >= 70) return 'text-orange-500';
  if (score >= 55) return 'text-yellow-600';
  if (score >= 40) return 'text-blue-600';
  return 'text-green-600';
}
