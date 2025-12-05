// src/components/ClientEditModal.jsx
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatPhoneE164, formatDateForInput } from "../utils/formatters";

const Field = ({ label, children }) => (
  <label className="block text-sm">
    <span className="text-slate-700">{label}</span>
    {children}
  </label>
);

export default function ClientEditModal({ open, client, onClose, onSave, saving }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({});

  useEffect(() => {
    const formatted = { ...client };
    if (formatted.dob) formatted.dob = formatDateForInput(formatted.dob);
    if (formatted.effectiveDate) formatted.effectiveDate = formatDateForInput(formatted.effectiveDate);
    setForm(formatted || {});
  }, [client]);

  if (!open) return null;

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handlePhoneBlur() {
    if (form.phone) {
      const formatted = formatPhoneE164(form.phone);
      set("phone", formatted);
    }
  }

  async function submit(e) {
    e.preventDefault();
    const formattedData = {
      ...form,
      phone: formatPhoneE164(form.phone)
    };
    await onSave(formattedData);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl ring-1 ring-black/5">
        <div className="h-2 bg-amber-400 rounded-t-2xl" />
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">{t('editClientDetails')}</h2>
            <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700">
              ✕
            </button>
          </div>

          {/* Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={t('firstName')}>
              <input className="w-full border rounded px-3 py-2"
                value={form.firstName || ""}
                onChange={(e)=>set("firstName", e.target.value)} />
            </Field>
            <Field label={t('lastName')}>
              <input className="w-full border rounded px-3 py-2"
                value={form.lastName || ""}
                onChange={(e)=>set("lastName", e.target.value)} />
            </Field>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={t('emailLabel')}>
              <input className="w-full border rounded px-3 py-2"
                value={form.email || ""}
                onChange={(e)=>set("email", e.target.value)} />
            </Field>
            <Field label={t('phone')}>
              <input className="w-full border rounded px-3 py-2"
                value={form.phone || ""}
                onChange={(e)=>set("phone", e.target.value)}
                onBlur={handlePhoneBlur}
                placeholder={t('autoFormatsPhone')} />
            </Field>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={t('dateOfBirth')}>
              <input type="date" className="w-full border rounded px-3 py-2"
                value={form.dob || ""}
                onChange={(e)=>set("dob", e.target.value)} />
            </Field>
            <Field label={t('effectiveDate')}>
              <input type="date" className="w-full border rounded px-3 py-2"
                value={form.effectiveDate || ""}
                onChange={(e)=>set("effectiveDate", e.target.value)} />
            </Field>
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Field label={t('address')}>
              <input className="w-full border rounded px-3 py-2"
                value={form.address || ""}
                onChange={(e)=>set("address", e.target.value)} />
            </Field>
            <Field label={t('city')}>
              <input className="w-full border rounded px-3 py-2"
                value={form.city || ""}
                onChange={(e)=>set("city", e.target.value)} />
            </Field>
            <Field label={t('state')}>
              <input className="w-full border rounded px-3 py-2"
                value={form.state || ""}
                onChange={(e)=>set("state", e.target.value)} />
            </Field>
            <Field label={t('zip')}>
              <input className="w-full border rounded px-3 py-2"
                value={form.zip || ""}
                onChange={(e)=>set("zip", e.target.value)} />
            </Field>
          </div>

          {/* Plan / Language */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label={
              <div>
                {t('preferredLanguage')}
                <span className="ml-2 text-xs text-blue-600">{t('autoTranslatesSmsEmail')}</span>
              </div>
            }>
              <select className="w-full border rounded px-3 py-2 bg-white"
                value={form.preferredLanguage || "en"}
                onChange={(e)=>set("preferredLanguage", e.target.value)}>
                <option value="en">{t('englishFlag')}</option>
                <option value="es">{t('spanishFlag')}</option>
              </select>
            </Field>
            <Field label={t('carrier')}>
              <input className="w-full border rounded px-3 py-2"
                value={form.carrier || ""}
                onChange={(e)=>set("carrier", e.target.value)} />
            </Field>
            <Field label={t('plan')}>
              <input className="w-full border rounded px-3 py-2"
                value={form.plan || ""}
                onChange={(e)=>set("plan", e.target.value)} />
            </Field>
          </div>

          {/* Care */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label={t('primaryCare')}>
              <input className="w-full border rounded px-3 py-2"
                value={form.primaryCare || ""}
                onChange={(e)=>set("primaryCare", e.target.value)} />
            </Field>
            <Field label={t('specialists')}>
              <input className="w-full border rounded px-3 py-2"
                value={form.specialists || ""}
                onChange={(e)=>set("specialists", e.target.value)} />
            </Field>
            <Field label={t('medications')}>
              <input className="w-full border rounded px-3 py-2"
                value={form.medications || ""}
                onChange={(e)=>set("medications", e.target.value)} />
            </Field>
          </div>

          {/* Compliance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label={t('soaOnFile')}>
              <input className="w-full border rounded px-3 py-2"
                value={form.soaOnFile || ""}
                onChange={(e)=>set("soaOnFile", e.target.value)} />
            </Field>
            <Field label={t('soaSigned')}>
              <input className="w-full border rounded px-3 py-2"
                value={form.soaSigned || ""}
                onChange={(e)=>set("soaSigned", e.target.value)} />
            </Field>
            <Field label={t('ptcOnFile')}>
              <input className="w-full border rounded px-3 py-2"
                value={form.ptcOnFile || ""}
                onChange={(e)=>set("ptcOnFile", e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={t('ptcSigned')}>
              <input className="w-full border rounded px-3 py-2"
                value={form.ptcSigned || ""}
                onChange={(e)=>set("ptcSigned", e.target.value)} />
            </Field>
            <Field label={t('enrollmentOnFile')}>
              <input className="w-full border rounded px-3 py-2"
                value={form.enrollmentOnFile || ""}
                onChange={(e)=>set("enrollmentOnFile", e.target.value)} />
            </Field>
          </div>

          {/* Notes */}
          <Field label={t('notes')}>
            <textarea className="w-full border rounded px-3 py-2" rows={3}
              value={form.notes || ""}
              onChange={(e)=>set("notes", e.target.value)} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50">
              {t('cancel')}
            </button>
            <button type="submit"
              className="px-3 py-2 text-sm rounded bg-slate-900 text-white hover:opacity-95 disabled:opacity-50"
              disabled={!!saving}>
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
