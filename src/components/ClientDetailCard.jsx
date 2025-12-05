// src/components/ClientDetailCard.jsx
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { listClientUploads, uploadClientFile, deleteClientUpload, getUploadDownloadUrl, getBlueButtonStatus, getBlueButtonClaims } from "../api";
import { Upload, Trash2, Download, User, MapPin, Phone, Mail, Calendar, Heart, Pill, FileText, Shield, Pencil } from "lucide-react";
import { formatDate, formatPhoneDisplay } from "../utils/formatters";
import RecentCommunication from "./RecentCommunication";

export default function ClientDetailCard({ client, onClientUpdate, onViewComms, onEdit }) {
  const { t } = useTranslation();
  const [uploads, setUploads] = useState(client?.uploads || []);
  const [loadingUp, setLoadingUp] = useState(false);
  const fileRef = useRef(null);
  const [label, setLabel] = useState("SOA");

  // Blue Button state (for prescriptions display)
  const [bbStatus, setBbStatus] = useState(null);
  const [bbLoading, setBbLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        if (!client?.id) return;
        const rows = await listClientUploads(client.id);
        if (live) setUploads(rows);
      } catch {}
    }
    load();
    return () => { live = false; };
  }, [client?.id]);

  // Load Blue Button status and prescriptions
  useEffect(() => {
    let live = true;
    async function loadBlueButton() {
      if (!client?.id) return;
      try {
        setBbLoading(true);
        const status = await getBlueButtonStatus(client.id);
        if (live) {
          setBbStatus(status);
          if (status.connected) {
            // Load prescriptions
            const claimsData = await getBlueButtonClaims(client.id, 50);
            if (live) setPrescriptions(claimsData.claims || []);
          }
        }
      } catch (err) {
        console.error('Blue Button status error:', err);
      } finally {
        if (live) setBbLoading(false);
      }
    }
    loadBlueButton();
    return () => { live = false; };
  }, [client?.id]);

  async function onPick() {
    fileRef.current?.click();
  }
  async function onFileChange(e) {
    const f = e.target.files?.[0];
    if (!f || !client?.id) return;
    try {
      setLoadingUp(true);
      const created = await uploadClientFile(client.id, f, label || t('document'));
      setUploads(prev => [created, ...prev]);
    } catch (err) {
      alert(t('uploadFailed'));
    } finally {
      setLoadingUp(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  async function onDelete(u) {
    if (!client?.id) return;
    if (!confirm(`${t('delete')} ${u.originalName || u.file}?`)) return;
    try {
      await deleteClientUpload(client.id, u.id);
      setUploads(prev => prev.filter(x => x.id !== u.id));
    } catch {
      alert(t('deleteFailed'));
    }
  }

  const formatCurrency = (cents) => {
    if (!cents) return '—';
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Personal Information Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl transition-shadow">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-[#172A3A] flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white">
                <User size={18} />
              </span>
              {t('personalInformation')}
            </h3>
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-slate-500 hover:bg-slate-100 transition-all"
              >
                <Pencil size={12} /> {t('edit')}
              </button>
            )}
          </div>
        </div>
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <InfoRow icon={<User size={16} />} label={t('fullName')} value={`${client.firstName || ""} ${client.lastName || ""}`.trim()} />
              <InfoRow icon={<Calendar size={16} />} label={t('dateOfBirth')} value={formatDate(client.dob) || "—"} />
              <InfoRow icon={<Mail size={16} />} label={t('email')} value={client.email || "—"} link={client.email ? `mailto:${client.email}` : null} />
              <InfoRow icon={<Phone size={16} />} label={t('phone')} value={formatPhoneDisplay(client.phone) || "—"} link={client.phone ? `tel:${client.phone}` : null} />
            </div>
            <div className="space-y-4">
              <InfoRow icon={<MapPin size={16} />} label={t('address')} value={[client.address, client.city, client.state, client.zip].filter(Boolean).join(", ") || "—"} />
              <InfoRow icon={<FileText size={16} />} label={t('preferredLanguage')} value={client.preferredLanguage === 'es' ? t('spanish') : client.preferredLanguage === 'en' ? t('english') : client.preferredLanguage || "—"} />
              <InfoRow icon={<Calendar size={16} />} label={t('effectiveDate')} value={formatDate(client.effectiveDate) || "—"} />
            </div>
          </div>
        </div>
      </div>

      {/* Insurance & Healthcare Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl transition-shadow">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-[#172A3A] flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white">
                <Shield size={18} />
              </span>
              {t('insuranceHealthcare')}
            </h3>
            {/* Health Data Status Badge */}
            {!bbLoading && bbStatus?.connected && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                {t('healthDataConnected')}
              </span>
            )}
          </div>
        </div>
        <div className="p-6">
          {/* Insurance Info Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <InfoRow icon={<Shield size={16} />} label={t('carrier')} value={client.carrier || "—"} />
              <InfoRow icon={<FileText size={16} />} label={t('plan')} value={client.plan || "—"} />
              <InfoRow icon={<FileText size={16} />} label={t('planType')} value={client.planType || client.plan_type || "—"} />
            </div>
            <div className="space-y-4">
              <InfoRow icon={<Heart size={16} />} label={t('primaryCare')} value={client.primaryCare || "—"} />
              <InfoRow icon={<Heart size={16} />} label={t('specialists')} value={client.specialists || "—"} />
              <InfoRow icon={<Calendar size={16} />} label={t('lastSynced')} value={bbStatus?.lastSync ? formatDate(bbStatus.lastSync) : "—"} />
            </div>
          </div>

          {/* Prescriptions Section */}
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Pill size={18} className="text-emerald-600" />
                {t('prescriptions')}
                {prescriptions.length > 0 && (
                  <span className="text-xs font-normal text-slate-500">{t('medicationsCount', { count: prescriptions.length })}</span>
                )}
              </h4>
            </div>

            {prescriptions.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
                <Pill size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">
                  {bbStatus?.connected
                    ? t('noPrescriptionsFound')
                    : t('connectMedicareBlueButton')
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('medication')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('lastFilled')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('qty')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('days')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('cost')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('pharmacy')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {prescriptions.map((rx, idx) => (
                      <tr key={rx.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 text-sm">{rx.drug_name}</div>
                          {rx.generic_name && rx.generic_name !== rx.drug_name && (
                            <div className="text-xs text-slate-500">{rx.generic_name}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{formatDate(rx.fill_date)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{rx.quantity || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{rx.days_supply || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(rx.patient_pay_cents)}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{rx.pharmacy_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes Card */}
      {client.notes && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl transition-shadow">
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 border-b border-slate-100">
            <h3 className="font-bold text-lg text-[#172A3A] flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-white">
                <FileText size={18} />
              </span>
              {t('notes')}
            </h3>
          </div>
          <div className="p-6">
            <div className="text-sm text-slate-700 bg-slate-50 rounded-xl p-4 border border-slate-200 leading-relaxed">
              {client.notes}
            </div>
          </div>
        </div>
      )}

      {/* Recent Communication */}
      <RecentCommunication clientId={client?.id} onViewAll={onViewComms} />

      {/* Documents & Uploads Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl transition-shadow">
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-[#172A3A] flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center text-white">
                <Upload size={18} />
              </span>
              {t('documents')}
            </h3>
            {/* Upload control */}
            <div className="flex items-center gap-2">
              <select
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white hover:border-purple-400 transition-colors focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none"
                value={label}
                onChange={(e)=>setLabel(e.target.value)}
                title="Label for the upload"
              >
                <option value="SOA">{t('soa')}</option>
                <option value="PTC">{t('ptc')}</option>
                <option value="Enrollment">{t('enrollment')}</option>
                <option value="Other">{t('other')}</option>
              </select>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                onClick={onPick}
                disabled={loadingUp}
                title="Upload a document"
              >
                <Upload size={16}/> {loadingUp ? t('uploading') : t('addDocument')}
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={onFileChange} />
            </div>
          </div>
        </div>
        <div className="p-6">
          {uploads.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <Upload size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-500 font-medium">{t('noDocuments')}</p>
              <p className="text-xs text-slate-400 mt-1">{t('clickToUpload')}</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {uploads.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all group">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {(u.label || "DOC").substring(0, 3).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 truncate">{u.originalName || u.file}</div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <FileText size={12} />
                          {u.label || t('document')}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(u.date)}
                        </span>
                        <span>•</span>
                        <span>{formatSize(u.size)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <a
                      href={getUploadDownloadUrl(u.file)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-sm font-medium text-slate-700 hover:text-blue-600 transition-all"
                      title={t('download')}
                      target="_blank" rel="noreferrer"
                    >
                      <Download size={14}/> {t('download')}
                    </a>
                    <button
                      onClick={() => onDelete(u)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 hover:border-red-400 hover:bg-red-50 text-sm font-medium text-red-600 hover:text-red-700 transition-all"
                      title={t('delete')}
                    >
                      <Trash2 size={14}/> {t('delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, link }) {
  const content = (
    <div className="flex items-start gap-3 group">
      <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500 font-medium mb-0.5">{label}</div>
        <div className="text-sm text-slate-900 font-medium truncate">{value || "—"}</div>
      </div>
    </div>
  );

  if (link) {
    return (
      <a href={link} className="block hover:bg-slate-50 p-2 -m-2 rounded-lg transition-colors">
        {content}
      </a>
    );
  }

  return <div className="p-2 -m-2">{content}</div>;
}
function formatSize(n) {
  if (!n && n !== 0) return "—";
  const kb = n/1024, mb = kb/1024;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  if (kb >= 1) return `${kb.toFixed(1)} KB`;
  return `${n} B`;
}
