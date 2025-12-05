// IntegrationsSection.jsx - Beautiful integrations UI
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plug,
  Mail,
  CalendarClock,
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react';
import CRMIntegrations from './CRMIntegrations';

export default function IntegrationsSection({
  integrations,
  loadingIntegrations,
  connectIntegration,
  disconnectIntegration
}) {
  const { t } = useTranslation();
  const googleIntegration = integrations.find(i => i.provider === 'google');
  const microsoftIntegration = integrations.find(i => i.provider === 'microsoft');
  const isGoogleConnected = !!googleIntegration;
  const isMicrosoftConnected = !!microsoftIntegration;

  return (
    <div className="max-w-4xl">
      <div className="text-2xl font-extrabold text-[#172A3A] mb-2 flex items-center gap-2">
        <Plug size={28} />
        {t('integrationsTitle')}
      </div>
      <p className="text-gray-600 mb-8">
        {t('integrationsDesc')}
      </p>

      {loadingIntegrations ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="animate-spin text-[#FFB800]" size={32} />
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Google Integration Card */}
          <div className={`bg-white rounded-2xl shadow-lg p-8 border-2 transition-all ${isGoogleConnected ? 'border-green-500' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                    className="w-10 h-10"
                    alt="Google"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#172A3A] flex items-center gap-2">
                    {t('googleAccount')}
                    {isGoogleConnected && <CheckCircle2 className="text-green-600" size={20} />}
                  </h3>
                  <p className="text-gray-600 text-sm">{t('gmailCalendar')}</p>
                </div>
              </div>
              <div>
                {isGoogleConnected ? (
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold text-sm">
                    <CheckCircle2 size={16} />
                    {t('connected')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm">
                    <XCircle size={16} />
                    {t('notConnected')}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <Mail className="text-blue-600 mt-1" size={18} />
                <div>
                  <div className="font-semibold text-[#172A3A]">{t('emailSending')}</div>
                  <div className="text-sm text-gray-600">
                    {t('sendEmailsFromGmail')}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarClock className="text-blue-600 mt-1" size={18} />
                <div>
                  <div className="font-semibold text-[#172A3A]">{t('calendarSync')}</div>
                  <div className="text-sm text-gray-600">
                    {t('autoSyncAppointments')}
                  </div>
                </div>
              </div>
            </div>

            {isGoogleConnected ? (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-500">
                  {t('connectedOn', { date: new Date(googleIntegration.created_at).toLocaleDateString() })}
                </div>
                <button
                  onClick={() => disconnectIntegration('google')}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-6 py-2 font-bold rounded-lg transition-all"
                >
                  {t('disconnect')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => connectIntegration('google')}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 font-bold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Plug size={20} />
                {t('connectGoogleAccount')}
              </button>
            )}
          </div>

          {/* Microsoft Integration Card */}
          <div className={`bg-white rounded-2xl shadow-lg p-8 border-2 transition-all ${isMicrosoftConnected ? 'border-green-500' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
                    className="w-10 h-10"
                    alt="Microsoft"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#172A3A] flex items-center gap-2">
                    {t('microsoftAccount')}
                    {isMicrosoftConnected && <CheckCircle2 className="text-green-600" size={20} />}
                  </h3>
                  <p className="text-gray-600 text-sm">{t('outlookM365')}</p>
                </div>
              </div>
              <div>
                {isMicrosoftConnected ? (
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold text-sm">
                    <CheckCircle2 size={16} />
                    {t('connected')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm">
                    <XCircle size={16} />
                    {t('notConnected')}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <Mail className="text-blue-700 mt-1" size={18} />
                <div>
                  <div className="font-semibold text-[#172A3A]">{t('emailSending')}</div>
                  <div className="text-sm text-gray-600">
                    {t('sendEmailsFromOutlook')}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarClock className="text-blue-700 mt-1" size={18} />
                <div>
                  <div className="font-semibold text-[#172A3A]">{t('calendarSync')}</div>
                  <div className="text-sm text-gray-600">
                    {t('autoSyncAppointments')}
                  </div>
                </div>
              </div>
            </div>

            {isMicrosoftConnected ? (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-500">
                  {t('connectedOn', { date: new Date(microsoftIntegration.created_at).toLocaleDateString() })}
                </div>
                <button
                  onClick={() => disconnectIntegration('microsoft')}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-6 py-2 font-bold rounded-lg transition-all"
                >
                  {t('disconnect')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => connectIntegration('microsoft')}
                className="w-full bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white px-6 py-3 font-bold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Plug size={20} />
                {t('connectMicrosoftAccount')}
              </button>
            )}
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <div className="flex gap-4">
              <div className="text-blue-600 mt-1">
                <Mail size={24} />
              </div>
              <div>
                <h4 className="font-bold text-blue-900 mb-2">{t('whyConnectEmail')}</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ {t('emailBenefit1')}</li>
                  <li>✓ {t('emailBenefit2')}</li>
                  <li>✓ {t('emailBenefit3')}</li>
                  <li>✓ {t('emailBenefit4')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* CRM Integrations Section */}
          <CRMIntegrations />
        </div>
      )}
    </div>
  );
}
