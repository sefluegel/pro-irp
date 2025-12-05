// /frontend/src/pages/ClientProfile.jsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";
import ClientRiskChart from "../components/ClientRiskChart";
import MessageThread from "../components/MessageThread";
import EmailComposer from "../components/EmailComposer";
import ClientScheduleModal from "../components/ClientScheduleModal";
import ClientDetailCard from "../components/ClientDetailCard";
import CommsDrawer from "../components/CommsDrawer";
import ClientEditModal from "../components/ClientEditModal";
import RiskScoreCard from "../components/RiskScoreCard";
import CallOutcomeModal from "../components/CallOutcomeModal";
import { getClientById, addComm, updateClient, getBlueButtonStatus, getBlueButtonAuthUrl, disconnectBlueButton, syncBlueButtonData } from "../api";
import { Phone, MessageCircle, Mail, CalendarClock, CheckSquare, Heart, RefreshCw, Unlink, UserMinus } from "lucide-react";

const ClientProfile = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [client, setClient] = useState(null);
  const [showSms, setShowSms] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showComms, setShowComms] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [taskData, setTaskData] = useState({ title: "", notes: "", priority: "normal", dueDate: "" });
  const [savingClient, setSavingClient] = useState(false);
  const [showCallOutcome, setShowCallOutcome] = useState(false);

  // Blue Button state
  const [bbStatus, setBbStatus] = useState(null);
  const [bbLoading, setBbLoading] = useState(true);
  const [bbSyncing, setBbSyncing] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  // Check for Blue Button callback status
  useEffect(() => {
    const bbResult = searchParams.get('bluebutton');
    if (bbResult === 'connected') {
      alert(t('healthConnectedSuccess'));
      // Reload status
      getBlueButtonStatus(id).then(status => setBbStatus(status)).catch(() => {});
    } else if (bbResult === 'error') {
      const message = searchParams.get('message') || 'Unknown error';
      alert(`${t('healthConnectionFailed')}: ${message}`);
    }
  }, [searchParams, id, t]);

  // Load Blue Button status
  useEffect(() => {
    let live = true;
    async function loadBbStatus() {
      if (!id) return;
      try {
        setBbLoading(true);
        const status = await getBlueButtonStatus(id);
        if (live) setBbStatus(status);
      } catch (err) {
        console.error('Blue Button status error:', err);
      } finally {
        if (live) setBbLoading(false);
      }
    }
    loadBbStatus();
    return () => { live = false; };
  }, [id]);

  // Blue Button handlers
  async function handleConnectHealth() {
    try {
      const result = await getBlueButtonAuthUrl(id);
      if (result.ok && result.authUrl) {
        window.open(result.authUrl, '_blank', 'width=600,height=700');
      }
    } catch (err) {
      alert('Failed to start health data connection: ' + err.message);
    }
  }

  async function handleSyncHealth() {
    try {
      setBbSyncing(true);
      const result = await syncBlueButtonData(id);
      // Reload status
      const status = await getBlueButtonStatus(id);
      setBbStatus(status);
      // Reload client data
      const data = await getClientById(id);
      setClient(data);
      alert(`Sync complete! ${result.claimsFetched} claims fetched, ${result.clientFieldsUpdated?.length || 0} fields updated.`);
    } catch (err) {
      alert('Sync failed: ' + err.message);
    } finally {
      setBbSyncing(false);
    }
  }

  async function handleDisconnectHealth() {
    try {
      await disconnectBlueButton(id);
      setBbStatus({ connected: false });
      setShowDisconnectConfirm(false);
    } catch (err) {
      alert('Disconnect failed: ' + err.message);
    }
  }

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const data = await getClientById(id);
        if (live) setClient(data);
      } catch {}
    }
    if (id) load();
    return () => { live = false; };
  }, [id]);

  if (!client) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 font-[Inter]">
        <div className="text-slate-500">{t('loading')}</div>
      </div>
    );
  }

  // Determine client status: prospect (no effective date), active (has effective date), or lost
  const clientStatus = client.status === 'lost' ? 'lost' : (client.effectiveDate ? 'active' : 'prospect');

  const customerSince = (() => {
    if (!client.effectiveDate) return null;
    const start = new Date(client.effectiveDate);
    if (isNaN(start.getTime())) return null;
    const now = new Date();
    const diffTime = now - start;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return t('startsSoon');
    if (diffDays === 0) return t('today');
    if (diffDays < 30) return `${diffDays} ${diffDays !== 1 ? t('days') : t('day')}`;

    const months = Math.floor(diffDays / 30);
    if (months < 12) return `${months} ${months !== 1 ? t('months') : t('month')}`;

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return `${years} ${years !== 1 ? t('years') : t('year')}`;
    return `${years} ${years !== 1 ? t('years') : t('year')}, ${remainingMonths} ${remainingMonths !== 1 ? t('months') : t('month')}`;
  })();

  // Open compose drawers (sending happens inside the drawer/modal)
  function onSendTextDemo() {
    setShowSms(true);
  }
  function onSendEmailDemo() {
    setShowEmail(true);
  }
  async function onScheduleDemo() {
    setShowSchedule(true);
    await addComm(client.id, { type: "appointment", direction: "out", subject: "Policy Review", preview: "Scheduled for next week" });
  }
  async function onCallDemo() {
    if (!client.phone) {
      alert(t('noPhoneOnFile'));
      return;
    }

    if (!window.confirm(t('confirmCall', { name: `${client.firstName} ${client.lastName}`, phone: client.phone }))) {
      return;
    }

    try {
      const BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";
      const token = localStorage.getItem("token");

      const res = await fetch(`${BASE}/calls/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId: client.id,
          clientPhone: client.phone
        })
      });

      const data = await res.json();

      if (data.ok) {
        alert(`✅ ${data.message}`);
      } else {
        alert(`❌ ${t('callFailed')}: ${data.error}`);
      }
    } catch (error) {
      console.error("Call error:", error);
      alert(t('failedToInitiateCall'));
    }
  }

  async function handleSaveClient(updatedData) {
    setSavingClient(true);
    try {
      const updated = await updateClient(client.id, updatedData);
      setClient(updated);
      setShowEdit(false);
      alert(t('clientUpdated'));
    } catch (error) {
      console.error("Update client error:", error);
      alert(`${t('failedToUpdate')}: ${error.message}`);
    } finally {
      setSavingClient(false);
    }
  }

  async function handleMarkAsLost() {
    if (!lostReason.trim()) {
      alert(t('provideReasonLost'));
      return;
    }
    try {
      const updated = await updateClient(client.id, {
        status: 'lost',
        notes: client.notes
          ? `${client.notes}\n\n${t('lostCustomerPrefix')} (${new Date().toLocaleDateString()}) ---\n${lostReason.trim()}`
          : `${t('lostCustomerPrefix')} (${new Date().toLocaleDateString()}) ---\n${lostReason.trim()}`
      });
      setClient(updated);
      setShowLostModal(false);
      setLostReason("");
      alert(t('clientMarkedLost'));
    } catch (error) {
      console.error("Mark as lost error:", error);
      alert(`${t('failedToUpdate')}: ${error.message}`);
    }
  }

  async function handleReactivateClient() {
    if (!window.confirm(t('reactivateConfirm'))) return;
    try {
      const updated = await updateClient(client.id, { status: 'active' });
      setClient(updated);
      alert(t('clientReactivated'));
    } catch (error) {
      console.error("Reactivate error:", error);
      alert(`${t('failedToReactivate')}: ${error.message}`);
    }
  }

  async function saveTask() {
    if (!taskData.title.trim()) return;

    try {
      const BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE}/tasks/clients/${client.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: taskData.title.trim(),
          notes: taskData.notes.trim(),
          priority: taskData.priority,
          dueDate: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : null
        })
      });

      if (!res.ok) throw new Error("Failed to create task");

      // Reset and close
      setTaskData({ title: "", notes: "", priority: "normal", dueDate: "" });
      setShowTask(false);

      // Notify tasks page to refresh
      window.dispatchEvent(new CustomEvent("tasks:update"));

      alert(t('taskCreated'));
    } catch (error) {
      console.error("Create task error:", error);
      alert(t('failedToCreateTask'));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 py-8 font-[Inter]">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-[#172A3A] to-slate-800 rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FFB800] to-amber-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                  {(client.firstName?.[0] || "") + (client.lastName?.[0] || "")}
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-1">
                    {(client.firstName || "") + " " + (client.lastName || "")}
                  </h1>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 items-center text-slate-300 text-sm md:text-base">
                    {/* Status Badge */}
                    {clientStatus === 'active' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-400/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                        {t('activeStatus')}
                      </span>
                    )}
                    {clientStatus === 'prospect' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-400/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                        {t('prospectStatus')}
                      </span>
                    )}
                    {clientStatus === 'lost' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-400/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                        {t('lostStatus')}
                      </span>
                    )}
                    {customerSince && (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#FFB800]"></span>
                        {t('customerFor')} <b className="text-white">{customerSince}</b>
                      </span>
                    )}
                    {client.lastContact && (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        {t('lastContact')}: <b className="text-white">{client.lastContact}</b>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions - Redesigned */}
            <div className="flex flex-wrap gap-2">
              <button
                className="group relative flex items-center gap-2 bg-gradient-to-r from-[#FFB800] to-amber-500 hover:from-amber-500 hover:to-[#FFB800] text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                onClick={onCallDemo}
              >
                <Phone size={18} strokeWidth={2.5} />
                <span>{t('call')}</span>
              </button>
              <button
                className="group relative flex items-center gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-semibold px-5 py-2.5 rounded-xl border border-white/20 hover:border-white/30 shadow-lg transition-all duration-200 transform hover:scale-105"
                onClick={onSendTextDemo}
              >
                <MessageCircle size={18} strokeWidth={2.5} />
                <span>{t('text')}</span>
              </button>
              <button
                className="group relative flex items-center gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-semibold px-5 py-2.5 rounded-xl border border-white/20 hover:border-white/30 shadow-lg transition-all duration-200 transform hover:scale-105"
                onClick={onSendEmailDemo}
              >
                <Mail size={18} strokeWidth={2.5} />
                <span>{t('email')}</span>
              </button>
            </div>
          </div>

          {/* Secondary Actions Bar */}
          <div className="flex flex-wrap items-center gap-2 mt-6 pt-6 border-t border-white/10">
            <button
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-medium px-4 py-2 rounded-lg border border-white/20 transition-all"
              onClick={onScheduleDemo}
            >
              <CalendarClock size={16} /> {t('scheduleReview')}
            </button>
            <button
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white font-medium px-4 py-2 rounded-lg border border-white/20 transition-all"
              onClick={() => setShowTask(true)}
            >
              <CheckSquare size={16} /> {t('createTask')}
            </button>
            <button
              className="flex items-center gap-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 font-medium px-4 py-2 rounded-lg border border-orange-400/30 transition-all"
              onClick={() => setShowCallOutcome(true)}
            >
              <Phone size={16} /> Log Call Outcome
            </button>

            {/* Health Data Button - Prominent */}
            {bbLoading ? (
              <div className="flex items-center gap-2 bg-blue-500/20 text-blue-200 font-medium px-4 py-2 rounded-lg border border-blue-400/30">
                <RefreshCw size={16} className="animate-spin" /> {t('loading')}
              </div>
            ) : bbStatus?.connected ? (
              <div className="flex items-center gap-1">
                <span className="flex items-center gap-2 bg-green-500/30 text-green-200 font-medium px-3 py-2 rounded-lg border border-green-400/30">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  {t('healthConnected')}
                </span>
                <button
                  onClick={handleSyncHealth}
                  disabled={bbSyncing}
                  className="flex items-center gap-1 bg-blue-500/30 hover:bg-blue-500/40 text-blue-200 font-medium px-3 py-2 rounded-lg border border-blue-400/30 transition-all disabled:opacity-50"
                >
                  <RefreshCw size={14} className={bbSyncing ? 'animate-spin' : ''} />
                  {bbSyncing ? t('syncing') : t('sync')}
                </button>
                {!showDisconnectConfirm ? (
                  <button
                    onClick={() => setShowDisconnectConfirm(true)}
                    className="flex items-center gap-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 font-medium px-3 py-2 rounded-lg border border-red-400/30 transition-all"
                  >
                    <Unlink size={14} />
                  </button>
                ) : (
                  <div className="flex items-center gap-1 bg-red-500/30 px-2 py-1 rounded-lg border border-red-400/30">
                    <span className="text-xs text-red-200">{t('disconnectConfirm')}</span>
                    <button
                      onClick={handleDisconnectHealth}
                      className="px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                    >
                      {t('yes')}
                    </button>
                    <button
                      onClick={() => setShowDisconnectConfirm(false)}
                      className="px-2 py-1 text-xs font-medium text-slate-200 hover:bg-white/10 rounded transition-colors"
                    >
                      {t('no')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleConnectHealth}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold px-5 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                <Heart size={16} /> {t('connectHealthData')}
              </button>
            )}

            {/* Mark as Lost / Reactivate - Far Right */}
            {clientStatus === 'active' && (
              <button
                className="flex items-center gap-1.5 ml-auto bg-red-500/20 hover:bg-red-500/30 text-red-200 text-sm font-medium px-3 py-1.5 rounded-lg border border-red-400/30 transition-all"
                onClick={() => setShowLostModal(true)}
              >
                <UserMinus size={14} /> {t('markAsLost')}
              </button>
            )}
            {clientStatus === 'lost' && (
              <button
                className="flex items-center gap-1.5 ml-auto bg-green-500/20 hover:bg-green-500/30 text-green-200 text-sm font-medium px-3 py-1.5 rounded-lg border border-green-400/30 transition-all"
                onClick={handleReactivateClient}
              >
                <UserMinus size={14} /> {t('reactivate')}
              </button>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Risk Score Card - AI Enhanced */}
          <RiskScoreCard
            clientId={client.id}
            initialScore={client.riskScore}
            onScoreChange={(newScore) => setClient({ ...client, riskScore: newScore })}
          />

          {/* Tasks Section */}
          <div className="md:col-span-2">
            <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg border border-slate-100 p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-[#172A3A] flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white">
                    <CheckSquare size={18} />
                  </span>
                  {t('upcomingTasks')}
                </h3>
                <button
                  onClick={() => setShowTask(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 hover:underline"
                >
                  + {t('addTask')}
                </button>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <div className="text-slate-400 text-sm">{t('noTasksScheduled')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Details + Uploads (includes Blue Button Medicare integration) */}
        <ClientDetailCard
          client={client}
          onClientUpdate={() => getClientById(id).then(data => setClient(data))}
          onViewComms={() => setShowComms(true)}
          onEdit={() => setShowEdit(true)}
        />

        {/* Modals / Drawers */}
      {showSms && (
        <MessageThread channel="sms" thread={[]} onClose={() => setShowSms(false)} unread={0}
          clientName={`${client.firstName || ""} ${client.lastName || ""}`}
          clientId={client.id}
        />
      )}
      {showEmail && (
        <EmailComposer
          onClose={() => setShowEmail(false)}
          clientName={`${client.firstName || ""} ${client.lastName || ""}`}
          clientId={client.id}
          clientEmail={client.email}
        />
      )}
      {showSchedule && (
        <ClientScheduleModal onClose={() => setShowSchedule(false)} client={client} />
      )}
      {showEdit && (
        <ClientEditModal open={true} client={client} onClose={() => setShowEdit(false)} onSave={handleSaveClient} saving={savingClient} />
      )}
      {showComms && (
        <CommsDrawer clientId={client.id} onClose={()=>setShowComms(false)} />
      )}
      {/* Call Outcome Modal for Churn Prediction */}
      <CallOutcomeModal
        isOpen={showCallOutcome}
        onClose={() => setShowCallOutcome(false)}
        client={client}
        onSuccess={() => {
          // Refresh client data to get updated risk score
          getClientById(id).then(data => setClient(data));
        }}
      />
      {/* Lost Customer Modal */}
      {showLostModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <UserMinus size={20} className="text-red-600" />
              </div>
              <div>
                <div className="font-bold text-lg">{t('markClientLostTitle')}</div>
                <p className="text-sm text-slate-500">
                  {t('markClientLostConfirm', { name: `${client.firstName} ${client.lastName}` })}
                </p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800">
                {t('canReactivateLater')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('reasonForLosing')} <span className="text-red-500">*</span></label>
              <textarea
                className="border rounded-xl px-3 py-2 w-full focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                rows={3}
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder={t('reasonPlaceholder')}
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                className="px-4 py-2 rounded-xl hover:bg-gray-100 font-medium"
                onClick={() => { setShowLostModal(false); setLostReason(""); }}
              >
                {t('cancel')}
              </button>
              <button
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleMarkAsLost}
                disabled={!lostReason.trim()}
              >
                {t('yesMarkAsLost')}
              </button>
            </div>
          </div>
        </div>
      )}
      {showTask && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6">
            <div className="font-bold text-lg mb-4">{t('createTaskFor')} {client.firstName} {client.lastName}</div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">{t('title')}</label>
                <input
                  className="border rounded-xl px-3 py-2 w-full"
                  value={taskData.title}
                  onChange={(e) => setTaskData(v => ({ ...v, title: e.target.value }))}
                  placeholder={t('callToDiscussPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('notes')}</label>
                <textarea
                  className="border rounded-xl px-3 py-2 w-full"
                  rows={3}
                  value={taskData.notes}
                  onChange={(e) => setTaskData(v => ({ ...v, notes: e.target.value }))}
                  placeholder={t('additionalDetailsPlaceholder')}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('priority')}</label>
                  <select
                    className="border rounded-xl px-3 py-2 w-full"
                    value={taskData.priority}
                    onChange={(e) => setTaskData(v => ({ ...v, priority: e.target.value }))}
                  >
                    <option value="low">{t('low')}</option>
                    <option value="normal">{t('normal')}</option>
                    <option value="high">{t('high')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('dueDate')}</label>
                  <input
                    type="datetime-local"
                    className="border rounded-xl px-3 py-2 w-full"
                    value={taskData.dueDate}
                    onChange={(e) => setTaskData(v => ({ ...v, dueDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                className="px-4 py-2 rounded-xl hover:bg-gray-100"
                onClick={() => setShowTask(false)}
              >
                {t('cancel')}
              </button>
              <button
                className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90"
                onClick={saveTask}
              >
                {t('createTask')}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ClientProfile;
