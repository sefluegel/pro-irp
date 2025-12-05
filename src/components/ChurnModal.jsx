// src/components/ChurnModal.jsx
// Modal for logging when a client churns (leaves)
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getChurnReasons, logChurnEvent } from '../api';

export default function ChurnModal({ isOpen, onClose, client, onChurnLogged }) {
  const { t } = useTranslation();
  const [reasons, setReasons] = useState({ grouped: {} });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    primaryReasonId: '',
    secondaryReasonIds: [],
    churnDate: new Date().toISOString().split('T')[0],
    newCarrier: '',
    newPlan: '',
    newPlanType: '',
    agentNotes: '',
    preventionNotes: '',
    wasPreventable: null,
    preventionOpportunity: '',
    warningSigns: []
  });

  const [warningSignInput, setWarningSignInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadReasons();
    }
  }, [isOpen]);

  const loadReasons = async () => {
    try {
      setLoading(true);
      const result = await getChurnReasons();
      setReasons(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.primaryReasonId) {
      setError(t('pleaseSelectPrimaryReason'));
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await logChurnEvent({
        clientId: client.id,
        ...formData
      });

      if (onChurnLogged) {
        onChurnLogged();
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddWarningSign = () => {
    if (warningSignInput.trim()) {
      setFormData({
        ...formData,
        warningSigns: [...formData.warningSigns, warningSignInput.trim()]
      });
      setWarningSignInput('');
    }
  };

  const handleRemoveWarningSign = (index) => {
    setFormData({
      ...formData,
      warningSigns: formData.warningSigns.filter((_, i) => i !== index)
    });
  };

  const handleSecondaryReasonToggle = (reasonId) => {
    const current = formData.secondaryReasonIds;
    if (current.includes(reasonId)) {
      setFormData({
        ...formData,
        secondaryReasonIds: current.filter(id => id !== reasonId)
      });
    } else if (current.length < 3) {
      setFormData({
        ...formData,
        secondaryReasonIds: [...current, reasonId]
      });
    }
  };

  if (!isOpen) return null;

  const categoryLabels = {
    cost: t('costIssues'),
    coverage: t('coverageIssues'),
    service: t('serviceIssues'),
    life_event: t('lifeEvents'),
    competitive: t('competitive'),
    other: t('other')
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-red-50 px-6 py-4 border-b border-red-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-red-900">{t('logClientChurn')}</h3>
                <p className="text-sm text-red-700">
                  {t('hasLeftPlan', { name: `${client?.first_name} ${client?.last_name}` })}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-red-400 hover:text-red-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Churn Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('whenDidTheyLeave')} *
                    </label>
                    <input
                      type="date"
                      value={formData.churnDate}
                      onChange={(e) => setFormData({ ...formData, churnDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Primary Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('primaryReasonForLeaving')} *
                    </label>
                    <div className="space-y-3">
                      {Object.entries(reasons.grouped || {}).map(([category, categoryReasons]) => (
                        <div key={category}>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                            {categoryLabels[category] || category}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {categoryReasons.map((reason) => (
                              <label
                                key={reason.id}
                                className={`flex items-center p-2 rounded-lg border cursor-pointer transition-colors ${
                                  formData.primaryReasonId === reason.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="primaryReason"
                                  value={reason.id}
                                  checked={formData.primaryReasonId === reason.id}
                                  onChange={(e) => setFormData({ ...formData, primaryReasonId: e.target.value })}
                                  className="sr-only"
                                />
                                <span className="text-sm text-gray-700">{reason.reason_name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Where did they go? */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('newCarrier')}
                      </label>
                      <input
                        type="text"
                        value={formData.newCarrier}
                        onChange={(e) => setFormData({ ...formData, newCarrier: e.target.value })}
                        placeholder={t('egHumana')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('newPlan')}
                      </label>
                      <input
                        type="text"
                        value={formData.newPlan}
                        onChange={(e) => setFormData({ ...formData, newPlan: e.target.value })}
                        placeholder={t('planName')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('planType')}
                      </label>
                      <select
                        value={formData.newPlanType}
                        onChange={(e) => setFormData({ ...formData, newPlanType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">{t('search')}...</option>
                        <option value="MA">{t('maMedicareAdvantage')}</option>
                        <option value="MA-PD">{t('maPd')}</option>
                        <option value="DSNP">{t('dsnp')}</option>
                        <option value="PDP">{t('pdpPartD')}</option>
                        <option value="Medigap">{t('medigap')}</option>
                        <option value="Unknown">{t('unknown')}</option>
                      </select>
                    </div>
                  </div>

                  {/* Was it preventable? */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('couldThisBeenPrevented')}
                    </label>
                    <div className="flex space-x-4">
                      <label className={`flex items-center px-4 py-2 rounded-lg border cursor-pointer ${
                        formData.wasPreventable === true ? 'border-green-500 bg-green-50' : 'border-gray-200'
                      }`}>
                        <input
                          type="radio"
                          name="preventable"
                          checked={formData.wasPreventable === true}
                          onChange={() => setFormData({ ...formData, wasPreventable: true })}
                          className="sr-only"
                        />
                        <span className="text-sm">{t('yesPreventable')}</span>
                      </label>
                      <label className={`flex items-center px-4 py-2 rounded-lg border cursor-pointer ${
                        formData.wasPreventable === false ? 'border-red-500 bg-red-50' : 'border-gray-200'
                      }`}>
                        <input
                          type="radio"
                          name="preventable"
                          checked={formData.wasPreventable === false}
                          onChange={() => setFormData({ ...formData, wasPreventable: false })}
                          className="sr-only"
                        />
                        <span className="text-sm">{t('noUnavoidable')}</span>
                      </label>
                    </div>
                  </div>

                  {/* Prevention opportunity (if preventable) */}
                  {formData.wasPreventable === true && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('whatCouldPrevented')}
                      </label>
                      <select
                        value={formData.preventionOpportunity}
                        onChange={(e) => setFormData({ ...formData, preventionOpportunity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">{t('search')}...</option>
                        <option value="early_outreach">{t('earlyOutreach')}</option>
                        <option value="better_plan_match">{t('betterPlanMatch')}</option>
                        <option value="cost_assistance">{t('costAssistance')}</option>
                        <option value="provider_network">{t('providerNetwork')}</option>
                        <option value="education">{t('education')}</option>
                        <option value="relationship">{t('relationshipBuilding')}</option>
                        <option value="other">{t('other')}</option>
                      </select>
                    </div>
                  )}

                  {/* Warning Signs */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('warningSignsQuestion')}
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={warningSignInput}
                        onChange={(e) => setWarningSignInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddWarningSign())}
                        placeholder={t('complainedAboutCopays')}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddWarningSign}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        {t('add')}
                      </button>
                    </div>
                    {formData.warningSigns.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {formData.warningSigns.map((sign, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
                          >
                            {sign}
                            <button
                              type="button"
                              onClick={() => handleRemoveWarningSign(idx)}
                              className="ml-2 text-gray-400 hover:text-gray-600"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('additionalNotes')}
                    </label>
                    <textarea
                      value={formData.agentNotes}
                      onChange={(e) => setFormData({ ...formData, agentNotes: e.target.value })}
                      rows={3}
                      placeholder={t('anyContextWhy')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting || !formData.primaryReasonId}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? t('logging') : t('logChurn')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
