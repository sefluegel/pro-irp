// /frontend/src/pages/Settings.jsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import IntegrationsSection from "../components/IntegrationsSection";
import { formatPhoneE164 } from "../utils/formatters";
import {
  User2,
  Lock,
  Bell,
  Database,
  Palette,
  ShieldCheck,
  CalendarClock,
  Users,
  Code,
  ClipboardList,
  Trash2,
  ChevronRight,
  Globe,
  Plug,
  Mail,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Bot
} from "lucide-react";
import { updateAssistantName } from "../api";

const getSidebarOptions = (t) => [
  { key: "profile", label: t('profileLogin'), icon: <User2 size={18} /> },
  { key: "security", label: t('security'), icon: <Lock size={18} /> },
  { key: "language", label: t('languagePreference'), icon: <Globe size={18} /> },
  { key: "notifications", label: t('notifications'), icon: <Bell size={18} /> },
  { key: "integrations", label: t('integrations'), icon: <Plug size={18} /> },
  { key: "branding", label: t('brandingTheme'), icon: <Palette size={18} /> },
  { key: "users", label: t('userManagement'), icon: <Users size={18} /> },
  { key: "audit", label: t('auditLogs'), icon: <ClipboardList size={18} /> },
  { key: "api", label: t('apiAccess'), icon: <Code size={18} /> },
  { key: "data", label: t('dataExportImport'), icon: <Database size={18} /> },
  { key: "compliance", label: t('compliancePrivacy'), icon: <ShieldCheck size={18} /> },
  { key: "danger", label: t('dangerZone'), icon: <Trash2 size={18} /> },
];

const Settings = () => {
  const { i18n, t } = useTranslation();
  const [section, setSection] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('light');
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
  const [languageSaved, setLanguageSaved] = useState(false);
  const [integrations, setIntegrations] = useState([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [assistantNameInput, setAssistantNameInput] = useState('');
  const [savingAssistant, setSavingAssistant] = useState(false);
  const [assistantSaved, setAssistantSaved] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const token = localStorage.getItem("token");
        const BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";
        const res = await fetch(`${BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setProfile({
            name: json.user.name || "",
            email: json.user.email || "",
            role: json.user.role || "agent",
          });
          setPhoneNumber(json.user.phone || '');
          setAssistantNameInput(json.user.assistantName || 'Alex');
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const saveLanguagePreference = () => {
    i18n.changeLanguage(selectedLanguage);
    setLanguageSaved(true);
    setTimeout(() => setLanguageSaved(false), 3000);
  };

  const savePhoneNumber = async () => {
    setSavingPhone(true);
    try {
      const formattedPhone = formatPhoneE164(phoneNumber);
      const token = localStorage.getItem("token");
      const BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";
      const res = await fetch(`${BASE}/auth/update-phone`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ phone: formattedPhone })
      });

      if (res.ok) {
        setPhoneSaved(true);
        setTimeout(() => setPhoneSaved(false), 3000);
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to save phone number');
      }
    } catch (err) {
      console.error('Failed to save phone number:', err);
      alert('Failed to save phone number. Please try again.');
    } finally {
      setSavingPhone(false);
    }
  };

  const saveAssistantName = async () => {
    setSavingAssistant(true);
    try {
      await updateAssistantName(assistantNameInput);
      setAssistantSaved(true);
      setTimeout(() => setAssistantSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save assistant name:', err);
      alert('Failed to save assistant name. Please try again.');
    } finally {
      setSavingAssistant(false);
    }
  };

  // Load integrations when viewing integrations section
  useEffect(() => {
    if (section === 'integrations') {
      loadIntegrations();
    }
  }, [section]);

  const loadIntegrations = async () => {
    setLoadingIntegrations(true);
    try {
      const token = localStorage.getItem("token");
      const BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";
      const res = await fetch(`${BASE}/calendar/integrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setIntegrations(json.integrations || []);
      }
    } catch (err) {
      console.error("Failed to load integrations:", err);
    } finally {
      setLoadingIntegrations(false);
    }
  };

  const connectIntegration = async (provider) => {
    try {
      const token = localStorage.getItem("token");
      const BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";
      const res = await fetch(`${BASE}/calendar/${provider}/connect`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.authUrl) {
          window.location.href = json.authUrl;
        }
      }
    } catch (err) {
      console.error(`Failed to connect ${provider}:`, err);
      alert(`Failed to connect ${provider}. Please try again.`);
    }
  };

  const disconnectIntegration = async (provider) => {
    if (!confirm(`Are you sure you want to disconnect ${provider === 'google' ? 'Google' : 'Microsoft'}? This will stop email sending and calendar sync.`)) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";
      const res = await fetch(`${BASE}/calendar/integrations/${provider}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await loadIntegrations();
        alert(`${provider === 'google' ? 'Google' : 'Microsoft'} disconnected successfully!`);
      }
    } catch (err) {
      console.error(`Failed to disconnect ${provider}:`, err);
      alert(`Failed to disconnect ${provider}. Please try again.`);
    }
  };

  return (
    <div className="flex flex-col md:flex-row max-w-6xl mx-auto bg-[#f6f7fb] min-h-[80vh] rounded-2xl shadow-lg border">
      {/* Sidebar */}
      <div className="min-w-[230px] border-r bg-white rounded-l-2xl flex flex-col py-6 px-3">
        <div className="text-2xl font-extrabold text-[#172A3A] px-2 pb-6 tracking-tight">
          {t('settings')}
        </div>
        <ul className="flex-1">
          {getSidebarOptions(t).map(opt => (
            <li key={opt.key}>
              <button
                className={`flex items-center w-full gap-2 px-4 py-3 rounded-lg mb-1 font-medium text-left transition ${
                  section === opt.key
                    ? "bg-[#FFB800]/20 text-[#172A3A] font-bold"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
                onClick={() => setSection(opt.key)}
              >
                {opt.icon}
                <span>{opt.label}</span>
                {section === opt.key && (
                  <ChevronRight size={18} className="ml-auto text-[#FFB800]" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-12 bg-[#f6f7fb] rounded-r-2xl min-h-[700px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : (
          <>
        {/* Profile Section */}
        {section === "profile" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-xl">
            <div className="text-xl font-bold text-[#172A3A] mb-4">{t('profileLogin')}</div>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <b>Note:</b> {t('profileEditNote')}
            </div>
            <div className="space-y-4">
              <div>
                <label className="font-semibold text-[#172A3A] block mb-1">{t('name')}</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                  value={profile?.name || ""}
                  readOnly
                />
              </div>
              <div>
                <label className="font-semibold text-[#172A3A] block mb-1">{t('email')}</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                  value={profile?.email || ""}
                  type="email"
                  readOnly
                />
              </div>
              <div>
                <label className="font-semibold text-[#172A3A] block mb-1">{t('role')}</label>
                <input
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                  value={profile?.role || ""}
                  readOnly
                />
              </div>
              <div>
                <label className="font-semibold text-[#172A3A] block mb-1">
                  {t('phoneForCall')}
                </label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FFB800] focus:border-[#FFB800]"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                />
                <p className="text-sm text-gray-600 mt-1">
                  {t('phoneWillRing')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={savePhoneNumber}
                disabled={savingPhone}
                className="bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] px-6 py-2 font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPhone ? t('saving') : t('savePhoneNumber')}
              </button>
              {phoneSaved && (
                <div className="text-green-600 font-semibold flex items-center gap-2">
                  ✓ {t('phoneNumberSaved')}
                </div>
              )}
            </div>

            {/* AI Assistant Name Section */}
            <div className="mt-8 pt-6 border-t">
              <div className="flex items-center gap-3 mb-4">
                <Bot className="text-blue-600" size={24} />
                <div className="text-xl font-bold text-[#172A3A]">AI Assistant</div>
              </div>
              <p className="text-gray-600 mb-4">
                Name your AI assistant! This name will appear in your daily briefings when your assistant gives you updates about your clients and tasks.
              </p>
              <div className="mb-4">
                <label className="font-semibold text-[#172A3A] block mb-1">
                  Assistant Name
                </label>
                <input
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FFB800] focus:border-[#FFB800]"
                  value={assistantNameInput}
                  onChange={(e) => setAssistantNameInput(e.target.value)}
                  type="text"
                  placeholder="Alex"
                  maxLength={50}
                />
                <p className="text-sm text-gray-600 mt-1">
                  Your assistant will introduce themselves like: "Your morning brief from <b>{assistantNameInput || 'Alex'}</b>, your AI assistant"
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={saveAssistantName}
                  disabled={savingAssistant || !assistantNameInput.trim()}
                  className="bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] px-6 py-2 font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingAssistant ? 'Saving...' : 'Save Assistant Name'}
                </button>
                {assistantSaved && (
                  <div className="text-green-600 font-semibold flex items-center gap-2">
                    ✓ Assistant name saved!
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <b>Note:</b> {t('otherProfileFieldsNote')}
            </div>
          </div>
        )}

        {/* Security */}
        {section === "security" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-xl">
            <div className="text-xl font-bold text-[#172A3A] mb-4">{t('security')}</div>
            <div className="mb-2 text-gray-700">
              {t('updatePasswordAnd2FA')}
            </div>
            <div className="space-y-4">
              <div>
                <label className="font-semibold text-[#172A3A] block mb-1">{t('currentPassword')}</label>
                <input className="w-full px-3 py-2 border rounded-lg" type="password" placeholder="••••••••" />
              </div>
              <div>
                <label className="font-semibold text-[#172A3A] block mb-1">{t('newPassword')}</label>
                <input className="w-full px-3 py-2 border rounded-lg" type="password" />
              </div>
              <div>
                <label className="font-semibold text-[#172A3A] block mb-1">{t('twoFactorAuth')}</label>
                <div className="flex gap-4 mt-2">
                  <button className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-4 py-2 rounded transition">
                    {t('enable2FA')}
                  </button>
                  <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-4 py-2 rounded transition">
                    {t('manageDevices')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Language Preference */}
        {section === "language" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-xl">
            <div className="text-xl font-bold text-[#172A3A] mb-4 flex items-center gap-2">
              <Globe size={24} />
              {t('languagePreference')}
            </div>
            <div className="mb-6 text-gray-700">
              {t('chooseLanguage')}
            </div>

            <div className="space-y-4">
              <div
                onClick={() => setSelectedLanguage('en')}
                className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
                  selectedLanguage === 'en'
                    ? 'border-[#FFB800] bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">🇺🇸</div>
                    <div>
                      <div className="font-bold text-lg text-[#172A3A]">{t('english')}</div>
                      <div className="text-sm text-gray-600">{t('unitedStates')}</div>
                    </div>
                  </div>
                  {selectedLanguage === 'en' && (
                    <div className="w-8 h-8 rounded-full bg-[#FFB800] flex items-center justify-center text-white font-bold">
                      ✓
                    </div>
                  )}
                </div>
              </div>

              <div
                onClick={() => setSelectedLanguage('es')}
                className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
                  selectedLanguage === 'es'
                    ? 'border-[#FFB800] bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">🇪🇸</div>
                    <div>
                      <div className="font-bold text-lg text-[#172A3A]">{t('spanish')}</div>
                      <div className="text-sm text-gray-600">Spanish</div>
                    </div>
                  </div>
                  {selectedLanguage === 'es' && (
                    <div className="w-8 h-8 rounded-full bg-[#FFB800] flex items-center justify-center text-white font-bold">
                      ✓
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={saveLanguagePreference}
                className="bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] px-6 py-3 font-bold rounded-lg transition-all shadow-md hover:shadow-lg"
                disabled={selectedLanguage === i18n.language}
              >
                {t('save')} {t('languagePreference')}
              </button>
              {languageSaved && (
                <div className="text-green-600 font-semibold flex items-center gap-2">
                  ✓ {t('languageSaved')}
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-semibold text-blue-900 mb-2">📧 {t('autoTranslationNote')}</div>
              <div className="text-sm text-blue-800">
                {t('autoTranslationDesc')}
              </div>
            </div>
          </div>
        )}

        {/* Notifications */}
        {section === "notifications" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-xl">
            <div className="text-xl font-bold text-[#172A3A] mb-4">{t('notifications')}</div>
            <div className="mb-2 text-gray-700">
              {t('chooseNotifications')}
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="sms" className="accent-[#FFB800]" />
                <label htmlFor="sms" className="font-semibold">{t('smsReminders')}</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="email" className="accent-[#FFB800]" />
                <label htmlFor="email" className="font-semibold">{t('emailNotifications')}</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="inapp" className="accent-[#FFB800]" />
                <label htmlFor="inapp" className="font-semibold">{t('inAppAlerts')}</label>
              </div>
            </div>
            <button className="bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] px-6 py-2 font-bold rounded-lg mt-6 transition">
              {t('saveNotificationSettings')}
            </button>
          </div>
        )}

        {/* Integrations */}
        {section === "integrations" && (
          <IntegrationsSection
            integrations={integrations}
            loadingIntegrations={loadingIntegrations}
            connectIntegration={connectIntegration}
            disconnectIntegration={disconnectIntegration}
          />
        )}

        {/* Branding & Theme */}
        {section === "branding" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-xl">
            <div className="text-xl font-bold text-[#172A3A] mb-4">{t('brandingTheme')}</div>
            <div className="mb-4 text-gray-700">
              {t('customizeLookFeel')}
            </div>
            <div className="flex items-center gap-6 mb-6">
              <div>
                <div className="mb-2 font-semibold text-[#172A3A]">{t('theme')}</div>
                <select
                  className="px-4 py-2 border rounded-lg"
                  value={theme}
                  onChange={e => setTheme(e.target.value)}
                >
                  <option value="light">{t('light')}</option>
                  <option value="dark">{t('dark')}</option>
                  <option value="blue">{t('blue')}</option>
                </select>
              </div>
              <div>
                <div className="mb-2 font-semibold text-[#172A3A]">{t('logo')}</div>
                <input type="file" className="block w-full text-sm" />
              </div>
            </div>
            <button className="bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] px-6 py-2 font-bold rounded-lg">
              {t('saveBranding')}
            </button>
          </div>
        )}

        {/* User Management */}
        {section === "users" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-2xl">
            <div className="text-xl font-bold text-[#172A3A] mb-4">{t('userManagement')}</div>
            <div className="mb-4 text-gray-700">
              {t('userManagementDesc')}
            </div>
            <table className="w-full text-left mb-6">
              <thead>
                <tr className="text-[#172A3A]">
                  <th className="py-2">{t('name')}</th>
                  <th className="py-2">{t('email')}</th>
                  <th className="py-2">{t('role')}</th>
                  <th className="py-2">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-50">
                  <td className="py-2">Scott Fluegel</td>
                  <td className="py-2">scott@example.com</td>
                  <td className="py-2">{t('admin')}</td>
                  <td className="py-2"><button className="text-blue-600 hover:underline">{t('edit')}</button></td>
                </tr>
                <tr>
                  <td className="py-2">Spencer Fluegel</td>
                  <td className="py-2">spencer@example.com</td>
                  <td className="py-2">{t('agent')}</td>
                  <td className="py-2"><button className="text-red-600 hover:underline">{t('remove')}</button></td>
                </tr>
              </tbody>
            </table>
            <button className="bg-[#FFB800] hover:bg-yellow-400 text-[#172A3A] px-6 py-2 font-bold rounded-lg">
              {t('addNewUser')}
            </button>
          </div>
        )}

        {/* Audit Logs */}
        {section === "audit" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-2xl">
            <div className="text-xl font-bold text-[#172A3A] mb-4">{t('auditLogs')}</div>
            <div className="mb-4 text-gray-700">
              {t('auditLogsDesc')}
            </div>
            <ul className="divide-y">
              <li className="py-3">
                <span className="font-semibold text-[#172A3A]">2025-08-07</span>{" "}
                <span className="text-gray-700">— {t('loggedIn')}</span>
              </li>
              <li className="py-3">
                <span className="font-semibold text-[#172A3A]">2025-08-07</span>{" "}
                <span className="text-gray-700">— {t('updatedClient')}: Jane Doe</span>
              </li>
              <li className="py-3">
                <span className="font-semibold text-[#172A3A]">2025-08-06</span>{" "}
                <span className="text-gray-700">— {t('exportedClientData')}</span>
              </li>
              <li className="py-3">
                <span className="font-semibold text-[#172A3A]">2025-08-05</span>{" "}
                <span className="text-gray-700">— {t('changedPassword')}</span>
              </li>
            </ul>
          </div>
        )}

        {/* API Access */}
        {section === "api" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-xl">
            <div className="text-xl font-bold text-[#172A3A] mb-4">{t('apiAccess')}</div>
            <div className="mb-2 text-gray-700">
              {t('apiAccessDesc')}
            </div>
            <div className="mb-4">
              <input
                className="w-full px-3 py-2 border rounded-lg mb-2"
                value="pk_test_abc1234567890"
                readOnly
              />
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded">
                {t('regenerateToken')}
              </button>
            </div>
            <div className="text-xs text-gray-500">
              {t('apiTokenUsage')}
            </div>
          </div>
        )}

        {/* Data Export / Import */}
        {section === "data" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-xl">
            <div className="text-xl font-bold text-[#172A3A] mb-4">{t('dataExportImport')}</div>
            <div className="mb-2 text-gray-700">{t('dataExportImportDesc')}</div>
            <div className="flex gap-4 mb-4">
              <button className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-4 py-2 rounded shadow transition">
                {t('exportData')}
              </button>
              <button className="bg-green-100 hover:bg-green-200 text-green-800 font-bold px-4 py-2 rounded shadow transition">
                {t('importData')}
              </button>
            </div>
            <div className="text-xs text-gray-500">
              {t('exportsEncrypted')}
            </div>
          </div>
        )}

        {/* Compliance & Privacy */}
        {section === "compliance" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-xl">
            <div className="text-xl font-bold text-[#172A3A] mb-4">{t('compliancePrivacy')}</div>
            <div className="mb-2 text-gray-700">
              {t('complianceSettings')}
            </div>
            <ul className="space-y-2">
              <li>{t('hipaaCompliance')}: <span className="font-bold text-green-700">{t('enabled')}</span></li>
              <li>{t('dataEncryption')}: <span className="font-bold text-green-700">{t('active')}</span></li>
              <li>
                <button className="text-blue-700 hover:underline">{t('viewPrivacyPolicy')}</button>
              </li>
            </ul>
          </div>
        )}

        {/* Danger Zone */}
        {section === "danger" && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-xl border border-red-300">
            <div className="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
              <Trash2 size={24} /> {t('dangerZone')}
            </div>
            <div className="mb-4 text-gray-700">
              {t('dangerZoneDesc')}
            </div>
            <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 font-bold rounded-lg">
              {t('deleteAccount')}
            </button>
            <button className="ml-4 bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 font-bold rounded-lg">
              {t('resetAllData')}
            </button>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
};

export default Settings;
