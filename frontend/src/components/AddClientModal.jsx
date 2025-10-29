// src/components/AddClientModal.jsx
import React, { useRef, useState } from "react";

export default function AddClientModal({ open, onClose, onCreate }) {
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const addressRef = useRef(null);
  const effectiveRef = useRef(null);
  const languageRef = useRef(null);
  const carrierRef = useRef(null);
  const planRef = useRef(null);
  const primaryCareRef = useRef(null);
  const tagsRef = useRef(null);
  const [saving, setSaving] = useState(false);
  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name: nameRef.current.value.trim(),
        email: emailRef.current.value.trim() || undefined,
        phone: phoneRef.current.value.trim() || undefined,
        address: addressRef.current.value.trim() || undefined,
        effectiveDate: effectiveRef.current.value || undefined,
        language: languageRef.current.value || undefined,
        carrier: carrierRef.current.value || undefined,
        plan: planRef.current.value || undefined,
        primaryCare: primaryCareRef.current.value || undefined,
        // comma-separated -> array
        tags: tagsRef.current.value
          ? tagsRef.current.value.split(",").map(s => s.trim()).filter(Boolean)
          : [],
        status: "Active",
      };
      await onCreate(body);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xl font-semibold">Add Client</div>
          <button className="px-3 py-1 rounded border" onClick={onClose}>Close</button>
        </div>

        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="text-sm text-gray-600">Name*</label><input ref={nameRef} required className="w-full border rounded px-2 py-1" /></div>
          <div><label className="text-sm text-gray-600">Email</label><input ref={emailRef} type="email" className="w-full border rounded px-2 py-1" /></div>
          <div><label className="text-sm text-gray-600">Phone</label><input ref={phoneRef} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="text-sm text-gray-600">Address</label><input ref={addressRef} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="text-sm text-gray-600">Effective Date</label><input ref={effectiveRef} type="date" className="w-full border rounded px-2 py-1" /></div>
          <div><label className="text-sm text-gray-600">Preferred Language</label><input ref={languageRef} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="text-sm text-gray-600">Carrier</label><input ref={carrierRef} className="w-full border rounded px-2 py-1" /></div>
          <div><label className="text-sm text-gray-600">Plan</label><input ref={planRef} className="w-full border rounded px-2 py-1" /></div>
          <div className="md:col-span-2"><label className="text-sm text-gray-600">Primary Care</label><input ref={primaryCareRef} className="w-full border rounded px-2 py-1" /></div>
          <div className="md:col-span-2"><label className="text-sm text-gray-600">Tags (comma-separated)</label><input ref={tagsRef} placeholder="MAPD, Hot Lead" className="w-full border rounded px-2 py-1" /></div>

          <div className="md:col-span-2 flex justify-end gap-2 mt-2">
            <button type="button" className="px-4 py-2 rounded border" onClick={onClose}>Cancel</button>
            <button disabled={saving} className="px-4 py-2 rounded bg-[#FFB800] text-[#172A3A] font-semibold">
              {saving ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
