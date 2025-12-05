// src/pages/Clients.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getClients,
  addClient,
  updateClient,
  deleteClient,
  getExportCsvUrl,
  getImportHistory,
  reverseImport,
} from "../api";
import ClientFormFull from "../components/ClientFormFull";
import { History, RotateCcw, Clock, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

/* ---------- Small modal + confirm that match existing tone ---------- */
function Modal({ title, children, onClose, width = "max-w-2xl" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={`relative w-full ${width} bg-white rounded-2xl shadow-xl ring-1 ring-black/5`}>
        <div className="h-2 bg-amber-400 rounded-t-2xl" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
            <button className="text-slate-500 hover:text-slate-700" onClick={onClose}>
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
function Confirm({ text, onConfirm, onCancel, t, loading = false }) {
  return (
    <Modal title={t('pleaseConfirm')} onClose={loading ? undefined : onCancel}>
      <p className="text-slate-600 mb-4">{text}</p>
      <div className="flex justify-end gap-2">
        <button
          className="px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          onClick={onCancel}
          disabled={loading}
        >
          {t('cancel')}
        </button>
        <button
          className="px-3 py-2 text-sm rounded bg-red-600 text-white hover:opacity-95 disabled:opacity-50"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? t('deleting') || 'Deleting...' : t('delete')}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- Page ---------- */
export default function Clients() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // UI state that mirrors your existing layout
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmIds, setConfirmIds] = useState(null); // null or array of IDs to delete
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState({}); // id -> bool

  // Recent imports state
  const [importHistory, setImportHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reversingId, setReversingId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyMsg, setHistoryMsg] = useState("");

  async function load() {
    setErr("");
    try {
      setLoading(true);
      const data = await getClients();
      // newest first
      data.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      setRows(data);
    } catch (e) {
      setErr("Failed to load clients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Load import history
  const loadImportHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await getImportHistory();
      setImportHistory(data);
    } catch (e) {
      console.error('[IMPORT] Failed to load import history:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Load history when showHistory is toggled on
  useEffect(() => {
    if (showHistory && importHistory.length === 0) {
      loadImportHistory();
    }
  }, [showHistory, loadImportHistory, importHistory.length]);

  // Handle reversing an import
  const handleReverseImport = async (importId) => {
    if (!window.confirm('Are you sure you want to reverse this import? This will permanently delete all clients that were added in this batch.')) {
      return;
    }
    setReversingId(importId);
    try {
      const result = await reverseImport(importId);
      setHistoryMsg(`Reversed import: ${result.deletedCount} clients removed`);
      await loadImportHistory();
      await load(); // Refresh the client list
    } catch (e) {
      setErr('Failed to reverse import: ' + (e?.message || 'Unknown error'));
    } finally {
      setReversingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = `${r.firstName} ${r.lastName} ${r.email} ${r.phone} ${r.carrier} ${r.plan}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

  return (
    <div className="px-6 py-6">
      {/* Header like your screenshot */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">{t('clients')}</h1>
          <p className="text-slate-600">{t('allYourClients')}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 bg-[#FFB800] text-[#172A3A] font-semibold rounded-lg shadow hover:opacity-90"
            onClick={() => { setEditRow(null); setShowForm(true); }}
          >
            + {t('addClient')}
          </button>

          <button
            className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-2"
            onClick={() => nav("/clients/import")}
            title={t('import')}
          >
            <span role="img" aria-label="import">📥</span> {t('import')}
          </button>

          <a
            className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-2"
            href={getExportCsvUrl()}
            title={t('export')}
          >
            <span role="img" aria-label="export">📤</span> {t('export')}
          </a>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 px-2 py-2 rounded-lg border border-blue-200 hover:bg-blue-50"
          >
            <History size={14} />
            {showHistory ? 'Hide' : 'View'} History
            {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Success message for import reversal */}
      {historyMsg && (
        <div className="mb-4 bg-green-50 text-green-700 text-sm px-3 py-2 rounded border border-green-200 flex items-center justify-between">
          <span>{historyMsg}</span>
          <button onClick={() => setHistoryMsg("")} className="text-green-500 hover:text-green-700">✕</button>
        </div>
      )}

      {/* Recent Imports Section - Collapsible panel (triggered by button under Import) */}
      {showHistory && (
        <div className="mb-4 bg-white rounded-xl shadow-sm ring-1 ring-black/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <History size={16} className="text-blue-500" />
              Recent Bulk Imports
            </h3>
            <button
              onClick={loadImportHistory}
              disabled={loadingHistory}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {loadingHistory ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              Refresh
            </button>
          </div>

          {loadingHistory ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            </div>
          ) : importHistory.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              <Clock size={24} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No import history found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {importHistory.map((imp) => {
                const isReversed = imp.status === 'reversed';
                const date = new Date(imp.created_at);
                const formattedDate = date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={imp.id}
                    className={`p-3 rounded-lg border ${
                      isReversed
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-white border-gray-200 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-800 text-sm">
                            {imp.filename || 'Unnamed Import'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            isReversed
                              ? 'bg-gray-200 text-gray-600'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {imp.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formattedDate}
                          </span>
                          <span>•</span>
                          <span className="text-green-600">{imp.created_count} added</span>
                          {imp.skipped_count > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-yellow-600">{imp.skipped_count} skipped</span>
                            </>
                          )}
                        </div>
                        {isReversed && imp.reversed_at && (
                          <div className="text-xs text-gray-500 mt-1">
                            Reversed: {imp.reversed_count} clients removed
                          </div>
                        )}
                      </div>

                      {!isReversed && (
                        <button
                          onClick={() => handleReverseImport(imp.id)}
                          disabled={reversingId === imp.id}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-50 text-red-600 hover:bg-red-100 transition border border-red-200 disabled:opacity-50"
                        >
                          {reversingId === imp.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <RotateCcw size={12} />
                          )}
                          Undo
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Action row: Delete / Email / SMS + Columns / Search / More Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded border border-slate-200 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
            disabled={selectedIds.length === 0}
            onClick={() => setConfirmIds(selectedIds)}
          >
            🗑️ {t('delete')} {selectedIds.length > 0 && `(${selectedIds.length})`}
          </button>
          <button
            className="px-3 py-2 rounded border border-slate-200 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
            disabled={selectedIds.length === 0}
          >
            ✉️ {t('email')}
          </button>
          <button
            className="px-3 py-2 rounded border border-slate-200 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
            disabled={selectedIds.length === 0}
          >
            💬 {t('sms')}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-3 py-2 rounded border border-slate-200 hover:bg-slate-50 flex items-center gap-2">
            🧱 {t('columns')}
          </button>
          <input
            className="border rounded px-3 py-2 w-64"
            placeholder={t('searchNameEmailCarrier')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="px-3 py-2 rounded border border-slate-200 hover:bg-slate-50">
            {t('moreFilters')}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-black/5 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 w-10">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && filtered.every((r) => selected[r.id])}
                  onChange={(e) => {
                    const all = {};
                    if (e.target.checked) filtered.forEach((r) => (all[r.id] = true));
                    setSelected(all);
                  }}
                />
              </th>
              <th className="px-4 py-2 text-left">{t('name')}</th>
              <th className="px-4 py-2 text-left">{t('phone')}</th>
              <th className="px-4 py-2 text-left">{t('email')}</th>
              <th className="px-4 py-2 text-left">{t('carrier')}</th>
              <th className="px-4 py-2 text-left">{t('plan')}</th>
              <th className="px-4 py-2 text-left">{t('created')}</th>
              <th className="px-4 py-2 text-right">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">{t('loading')}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">{t('noClients')}</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={!!selected[c.id]}
                      onChange={(e) => setSelected((s) => ({ ...s, [c.id]: e.target.checked }))}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Link to={`/clients/${c.id}`} className="text-blue-600 hover:underline">
                      {c.firstName} {c.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{c.phone || "—"}</td>
                  <td className="px-4 py-2">{c.email || "—"}</td>
                  <td className="px-4 py-2">{c.carrier || "—"}</td>
                  <td className="px-4 py-2">{c.plan || "—"}</td>
                  <td className="px-4 py-2">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      className="text-blue-600 hover:underline mr-3"
                      onClick={() => { setEditRow(c); setShowForm(true); }}
                    >
                      {t('edit')}
                    </button>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => setConfirmIds([c.id])}
                    >
                      {t('delete')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Error */}
      {err && (
        <div className="mt-3 bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200">
          {err}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <Modal title={editRow ? t('editClient') : t('addClient')} onClose={() => { setShowForm(false); setEditRow(null); }}>
          <ClientFormFull
            initial={editRow}
            saving={saving}
            onCancel={() => { setShowForm(false); setEditRow(null); }}
            onSave={async (form) => {
              try {
                setSaving(true);
                if (editRow && editRow.id) {
                  await updateClient(editRow.id, form);
                } else {
                  await addClient(form);
                }
                await load();
                setShowForm(false);
                setEditRow(null);
              } catch (e) {
                console.error(e);
                alert(t('saveFailed'));
              } finally {
                setSaving(false);
              }
            }}
          />
        </Modal>
      )}

      {/* Delete confirm */}
      {confirmIds && confirmIds.length > 0 && (
        <Confirm
          t={t}
          loading={deleting}
          text={confirmIds.length === 1
            ? t('deleteThisClient')
            : t('deleteMultipleClients', { count: confirmIds.length }) || `Delete ${confirmIds.length} clients?`}
          onCancel={() => setConfirmIds(null)}
          onConfirm={async () => {
            setDeleting(true);
            let successCount = 0;
            let failCount = 0;

            for (const id of confirmIds) {
              try {
                await deleteClient(id);
                successCount++;
              } catch (err) {
                failCount++;
                console.error('[DELETE] Failed to delete client:', id, err);
              }
            }

            setDeleting(false);
            setConfirmIds(null);
            setSelected({}); // Clear selection
            await load();

            if (failCount > 0) {
              alert(t('deletePartialFail', { success: successCount, fail: failCount }) ||
                `Deleted ${successCount} clients. ${failCount} failed.`);
            }
          }}
        />
      )}

      {/* Footer: record count + pager hint (styling-only) */}
      <div className="text-xs text-slate-500 mt-2">
        {t('totalRecords', { count: rows.length })}
      </div>
    </div>
  );
}
