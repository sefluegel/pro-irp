// src/pages/AddClient.jsx
import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ClientFormFull from "../components/ClientFormFull";
import { addClient, parseEnrollmentPdf } from "../api";

export default function AddClient() {
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [initialData, setInitialData] = useState({});
  const [parsing, setParsing] = useState(false);
  const [parseSuccess, setParseSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  async function handleSave(payload) {
    try {
      setErr("");
      setSaving(true);
      const created = await addClient(payload);
      nav(`/clients/${created.id}`, { replace: true });
    } catch (e) {
      setErr(typeof e?.message === "string" ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  const processFile = useCallback(async (file) => {
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErr("Please select a PDF file");
      return;
    }

    try {
      setErr("");
      setParsing(true);
      setParseSuccess(false);

      const result = await parseEnrollmentPdf(file);

      if (result && result.data) {
        // Merge parsed data with existing form data
        setInitialData(prev => {
          const merged = { ...prev };
          for (const [key, value] of Object.entries(result.data)) {
            if (value !== null && value !== undefined && value !== '') {
              merged[key] = value;
            }
          }
          return merged;
        });
        setParseSuccess(true);
      }
    } catch (e) {
      setErr(typeof e?.message === "string" ? e.message : "Failed to parse PDF");
    } finally {
      setParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  function handleFileInput(e) {
    const file = e.target.files?.[0];
    processFile(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    processFile(file);
  }

  function handleClick() {
    fileInputRef.current?.click();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Add Client</h1>
      </div>

      {/* PDF Import Drop Zone - Large and Prominent */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mb-6 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50 scale-[1.02]'
            : parseSuccess
            ? 'border-green-400 bg-green-50'
            : 'border-blue-300 bg-blue-50/50 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center text-center">
          {parsing ? (
            <>
              <div className="w-12 h-12 mb-3 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="animate-spin w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <p className="text-blue-700 font-medium">Parsing enrollment PDF...</p>
              <p className="text-sm text-blue-600 mt-1">Extracting client information</p>
            </>
          ) : parseSuccess ? (
            <>
              <div className="w-12 h-12 mb-3 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-green-700 font-medium">PDF imported successfully!</p>
              <p className="text-sm text-green-600 mt-1">Review the auto-filled fields below</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setParseSuccess(false); }}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Upload another PDF
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-blue-900">
                {isDragging ? 'Drop PDF here' : 'Import from Enrollment PDF'}
              </p>
              <p className="text-sm text-blue-700 mt-1 max-w-md">
                Drag & drop a Medicare enrollment form here, or click to browse.
                <br />
                <span className="text-blue-600">Works with SunFire, carrier portals, Integrity, and more.</span>
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Choose PDF File
              </div>
            </>
          )}
        </div>
      </div>

      {err && (
        <div className="mb-4 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-200 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {err}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5">
        <ClientFormFull
          key={JSON.stringify(initialData)}
          initial={initialData}
          saving={saving}
          onCancel={() => nav("/clients")}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
