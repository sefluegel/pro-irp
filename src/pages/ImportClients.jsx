// src/pages/ImportClients.jsx - Beautiful Step-by-Step Import Wizard
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Papa from "papaparse";
import { bulkImportClients, getImportHistory, reverseImport } from "../api";
import { useNavigate } from "react-router-dom";
import {
  Upload, Download, AlertCircle, CheckCircle, Info, FileSpreadsheet,
  ArrowRight, ArrowLeft, Check, X, Sparkles, Users, Shield,
  FileCheck, AlertTriangle, Loader2, Eye, ChevronDown, ChevronUp,
  History, RotateCcw, Clock
} from "lucide-react";

// All mappable fields with descriptions
const FIELD_GROUPS = {
  required: [
    { key: "firstName", label: "First Name", desc: "Client's first name", required: true },
    { key: "lastName", label: "Last Name", desc: "Client's last name", required: true },
  ],
  contact: [
    { key: "phone", label: "Phone", desc: "Primary phone number (used for duplicate matching)", critical: true },
    { key: "email", label: "Email", desc: "Email address (also used for duplicate matching if no phone)" },
  ],
  policy: [
    { key: "effectiveDate", label: "Effective Date", desc: "Policy start date (MM/DD/YYYY)", critical: true },
    { key: "carrier", label: "Carrier", desc: "Insurance carrier name" },
    { key: "plan", label: "Plan Name", desc: "Specific plan name" },
    { key: "planType", label: "Plan Type", desc: "e.g., Medicare Advantage, Supplement" },
    { key: "status", label: "Status", desc: "active, inactive, or lost" },
  ],
  personal: [
    { key: "dob", label: "Date of Birth", desc: "MM/DD/YYYY format" },
    { key: "address", label: "Address", desc: "Street address" },
    { key: "city", label: "City", desc: "City name" },
    { key: "state", label: "State", desc: "State abbreviation (e.g., KY)" },
    { key: "zip", label: "ZIP Code", desc: "5-digit ZIP" },
  ],
  other: [
    { key: "notes", label: "Notes", desc: "Any additional notes about the client" },
  ],
};

const ALL_FIELDS = Object.values(FIELD_GROUPS).flat();
const MAP_KEY = "proirp_import_map_clients";

// Smart auto-mapping with fuzzy matching
function guessMap(headers) {
  const map = {};
  headers.forEach((h, i) => {
    const key = String(h || "").toLowerCase().trim().replace(/[^a-z0-9]/g, '');

    // Names
    if (/firstname|fname|first/.test(key)) map.firstName = i;
    if (/lastname|lname|last/.test(key) && !/first/.test(key)) map.lastName = i;
    if (/^name$/.test(key) && !map.firstName) map.firstName = i; // Single "name" column

    // Contact
    if (/email|mail/.test(key)) map.email = i;
    if (/phone|mobile|cell|tel/.test(key)) map.phone = i;

    // Policy
    if (/effective|effdate|startdate|policystart/.test(key)) map.effectiveDate = i;
    if (/carrier|insurance|insurer|company/.test(key)) map.carrier = i;
    if (/plantype|type/.test(key)) map.planType = i;
    else if (/plan/.test(key) && !/type/.test(key)) map.plan = i;
    if (/status/.test(key)) map.status = i;

    // Personal
    if (/dob|birth|birthdate|dateofbirth/.test(key)) map.dob = i;
    if (/address|street/.test(key) && !/email/.test(key)) map.address = i;
    if (/city/.test(key)) map.city = i;
    if (/state/.test(key) && !/estate/.test(key)) map.state = i;
    if (/zip|postal/.test(key)) map.zip = i;

    // Other
    if (/note|comment|memo/.test(key)) map.notes = i;
  });

  return map;
}

// Validation helpers
function validateDate(val) {
  if (!val) return null;
  const str = String(val).trim();
  const parsed = new Date(str);
  return !isNaN(parsed.getTime()) ? parsed.toISOString().split('T')[0] : null;
}

function validateStatus(val) {
  if (!val) return "active";
  const str = String(val).toLowerCase().trim();
  if (["active", "inactive", "lost", "churned"].includes(str)) return str;
  return "active";
}

// Step indicator component
function StepIndicator({ currentStep, steps }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, idx) => (
        <React.Fragment key={idx}>
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              idx < currentStep
                ? 'bg-green-500 text-white'
                : idx === currentStep
                  ? 'bg-indigo-600 text-white ring-4 ring-indigo-200'
                  : 'bg-gray-200 text-gray-500'
            }`}>
              {idx < currentStep ? <Check size={20} /> : idx + 1}
            </div>
            <span className={`text-xs mt-2 font-medium ${
              idx <= currentStep ? 'text-indigo-600' : 'text-gray-400'
            }`}>
              {step}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div className={`w-16 h-1 mx-2 rounded ${
              idx < currentStep ? 'bg-green-500' : 'bg-gray-200'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function ImportClients() {
  const nav = useNavigate();
  const fileInputRef = useRef(null);

  // Wizard state
  const [step, setStep] = useState(0);
  const steps = ["Upload File", "Map Columns", "Review Data", "Import"];

  // File state
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [map, setMap] = useState({});
  const [isDragging, setIsDragging] = useState(false);

  // UI state
  const [remember, setRemember] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationIssues, setValidationIssues] = useState([]);
  const [defaultCarrier, setDefaultCarrier] = useState("");

  // Recent imports state
  const [importHistory, setImportHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reversingId, setReversingId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  // Common carriers list
  const CARRIERS = [
    "Humana", "UnitedHealthcare", "Aetna", "Cigna", "Anthem",
    "Blue Cross Blue Shield", "Kaiser Permanente", "Molina Healthcare",
    "WellCare", "Centene", "CVS Health/Aetna", "Devoted Health",
    "Clover Health", "Oscar Health", "Bright Health", "Alignment Healthcare"
  ];

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
      setMsg(`Successfully reversed import: ${result.deletedCount} clients removed`);
      // Refresh history
      await loadImportHistory();
    } catch (e) {
      setErr('Failed to reverse import: ' + (e?.message || 'Unknown error'));
    } finally {
      setReversingId(null);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  function processFile(f) {
    if (!f) return;

    // Check file type - be permissive with MIME types since browsers can vary
    const fileName = f.name.toLowerCase();
    const fileType = f.type?.toLowerCase() || '';
    const isCSV = fileName.endsWith('.csv') ||
                  fileType === 'text/csv' ||
                  fileType === 'application/csv' ||
                  fileType === 'text/plain' || // Some systems report CSV as text/plain
                  fileType === ''; // Empty type is common on Windows drag-drop

    if (!isCSV) {
      setErr(`Please upload a CSV file. You uploaded: ${f.name} (type: ${f.type || 'unknown'})`);
      return;
    }

    setFile(f);
    setErr("");
    setMsg("");
    setWarnings([]);
    setValidationIssues([]);

    Papa.parse(f, {
      skipEmptyLines: true,
      complete: (res) => {
        if (!res.data || res.data.length < 2) {
          setErr("No data found. Make sure your file has a header row and at least one data row.");
          return;
        }
        const [head, ...data] = res.data;
        setHeaders(head);
        setRows(data);

        // Try saved mapping first, then auto-guess
        let initial = {};
        try {
          const saved = JSON.parse(localStorage.getItem(MAP_KEY) || "null");
          if (saved && Array.isArray(saved.__headers) && JSON.stringify(saved.__headers) === JSON.stringify(head)) {
            initial = saved;
          } else {
            initial = guessMap(head);
          }
        } catch {
          initial = guessMap(head);
        }
        setMap(initial);

        // Auto-advance to mapping step
        setStep(1);
      },
      error: (error) => {
        setErr(`Failed to parse file: ${error.message}`);
      }
    });
  }

  function onFile(e) {
    const f = e.target.files?.[0];
    processFile(f);
  }

  // Validation on step 2 -> 3
  function validateMapping() {
    const issues = [];

    // Check required fields
    if (map.firstName == null && map.lastName == null) {
      issues.push({ type: 'error', message: 'At least First Name or Last Name must be mapped' });
    }

    // Check critical fields
    if (map.effectiveDate == null) {
      issues.push({
        type: 'warning',
        message: 'Effective Date is not mapped. Retention tracking and OEP cohort features will be limited.'
      });
    }

    if (map.email == null && map.phone == null) {
      issues.push({
        type: 'error',
        message: 'Phone or Email must be mapped. At least one is required for duplicate detection and communication.'
      });
    }

    // Check for potential data issues
    let dateIssues = 0;
    let emptyNames = 0;

    rows.forEach((row, idx) => {
      const firstName = map.firstName != null ? row[map.firstName] : '';
      const lastName = map.lastName != null ? row[map.lastName] : '';
      const effDate = map.effectiveDate != null ? row[map.effectiveDate] : '';

      if (!firstName?.trim() && !lastName?.trim()) {
        emptyNames++;
      }

      if (effDate && !validateDate(effDate)) {
        dateIssues++;
      }
    });

    if (emptyNames > 0) {
      issues.push({
        type: 'warning',
        message: `${emptyNames} row(s) have empty names and will be skipped`
      });
    }

    if (dateIssues > 0) {
      issues.push({
        type: 'warning',
        message: `${dateIssues} row(s) have invalid date formats that couldn't be parsed`
      });
    }

    setValidationIssues(issues);
    return !issues.some(i => i.type === 'error');
  }

  function onChangeMap(field, idx) {
    setMap(m => ({ ...m, [field]: idx === "" ? undefined : Number(idx) }));
  }

  function downloadTemplate() {
    const header = [
      "First Name", "Last Name", "Email", "Phone",
      "Effective Date", "Carrier", "Plan", "Plan Type", "Status",
      "DOB", "Address", "City", "State", "ZIP",
      "Notes"
    ];
    const sample = [
      ["Jane", "Doe", "jane@example.com", "555-111-2222", "01/15/2024", "Humana", "Medicare Advantage Plus", "Medicare Advantage", "active", "03/12/1950", "123 Main St", "Louisville", "KY", "40202", "Prefers email contact"],
      ["John", "Smith", "john@example.com", "555-222-3333", "10/01/2023", "UnitedHealthcare", "AARP Medicare Supplement", "Supplement", "active", "07/22/1948", "456 Oak Ave", "Lexington", "KY", "40507", "Birthday in July"],
      ["Mary", "Johnson", "mary@example.com", "555-333-4444", "01/01/2024", "Aetna", "Silver Plan", "Medicare Advantage", "active", "11/05/1952", "789 Pine Rd", "Bowling Green", "KY", "42101", "Spanish speaker"],
    ];
    const csv = [header, ...sample].map(r => r.map(cell => {
      const v = String(cell ?? "").replace(/"/g, '""');
      return /[",\n]/.test(v) ? `"${v}"` : v;
    }).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pro-irp-client-import-template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function onImport() {
    try {
      setErr("");
      setMsg("");
      setImporting(true);

      // Build objects from mapping
      const out = rows.map((r) => {
        const o = {};
        ALL_FIELDS.forEach(({ key }) => {
          const i = map[key];
          if (i != null && i !== "") o[key] = r[i] ?? "";
        });

        // Split "Name" into first/last if needed
        if ((!o.lastName || !o.firstName) && o.firstName && !map.lastName && / /.test(o.firstName)) {
          const [first, ...rest] = String(o.firstName).split(" ");
          o.firstName = first;
          o.lastName = rest.join(" ");
        }

        // Validate and clean data
        if (o.effectiveDate) {
          o.effectiveDate = validateDate(o.effectiveDate);
        }
        if (o.dob) {
          o.dob = validateDate(o.dob);
        }
        if (o.status) {
          o.status = validateStatus(o.status);
        }

        // Apply default carrier if no carrier column mapped and default is set
        if (!o.carrier && defaultCarrier) {
          o.carrier = defaultCarrier;
        }

        return o;
      });

      const cleaned = out.filter(o => {
        return String(o.firstName || "").trim() !== "" || String(o.lastName || "").trim() !== "";
      });

      if (cleaned.length === 0) {
        setErr("No valid clients to import. Make sure names are mapped correctly.");
        setImporting(false);
        return;
      }

      // Save mapping
      if (remember && headers.length) {
        localStorage.setItem(MAP_KEY, JSON.stringify({ ...map, __headers: headers }));
      }

      const result = await bulkImportClients(cleaned, true, file?.name || 'import.csv');
      setImportResult(result);
      setStep(3);

    } catch (e) {
      setErr("Import failed: " + (e?.message || "Unknown error"));
    } finally {
      setImporting(false);
    }
  }

  function goToStep(newStep) {
    if (newStep === 2 && step === 1) {
      // Validate before moving to review
      if (!validateMapping()) {
        return;
      }
    }
    setStep(newStep);
  }

  const preview = useMemo(() => rows.slice(0, 5), [rows]);
  const mappedCount = Object.values(map).filter(v => v != null && v !== "").length;
  const hasEffectiveDate = map.effectiveDate != null;
  const hasName = map.firstName != null || map.lastName != null;

  // Build preview data
  const previewData = useMemo(() => {
    return preview.map(row => {
      const obj = {};
      ALL_FIELDS.forEach(({ key }) => {
        const i = map[key];
        if (i != null) obj[key] = row[i] || '';
      });
      // Apply default carrier for preview
      if (!obj.carrier && defaultCarrier) {
        obj.carrier = defaultCarrier;
      }
      return obj;
    });
  }, [preview, map, defaultCarrier]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Users className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-slate-800">Import Clients</h1>
          </div>
          <p className="text-slate-600">
            Easily import your client list in just a few steps
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={step} steps={steps} />

        {/* Error Message */}
        {err && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3">
            <AlertCircle className="mt-0.5 flex-shrink-0" size={20} />
            <div>{err}</div>
            <button onClick={() => setErr("")} className="ml-auto text-red-500 hover:text-red-700">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Success Message */}
        {msg && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-start gap-3">
            <CheckCircle className="mt-0.5 flex-shrink-0" size={20} />
            <div>{msg}</div>
            <button onClick={() => setMsg("")} className="ml-auto text-green-500 hover:text-green-700">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Recent Imports Section - Collapsible */}
        <div className="mb-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition mb-3"
          >
            <History size={18} />
            {showHistory ? 'Hide' : 'View'} Recent Imports
            {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showHistory && (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <History size={18} className="text-indigo-500" />
                  Recent Bulk Imports
                </h3>
                <button
                  onClick={loadImportHistory}
                  disabled={loadingHistory}
                  className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  {loadingHistory ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Refresh
                </button>
              </div>

              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                </div>
              ) : importHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Clock size={32} className="mx-auto mb-2 text-slate-300" />
                  <p>No import history found</p>
                  <p className="text-sm">Your import batches will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
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
                        className={`p-4 rounded-lg border ${
                          isReversed
                            ? 'bg-gray-50 border-gray-200'
                            : 'bg-white border-gray-200 hover:border-indigo-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-slate-800">
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
                            <div className="text-sm text-slate-500 flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <Clock size={14} />
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
                              {imp.error_count > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-red-600">{imp.error_count} errors</span>
                                </>
                              )}
                            </div>
                            {isReversed && imp.reversed_at && (
                              <div className="text-xs text-gray-500 mt-1">
                                Reversed on {new Date(imp.reversed_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })} ({imp.reversed_count} clients removed)
                              </div>
                            )}
                          </div>

                          {!isReversed && (
                            <button
                              onClick={() => handleReverseImport(imp.id)}
                              disabled={reversingId === imp.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-red-50 text-red-600 hover:bg-red-100 transition border border-red-200 disabled:opacity-50"
                            >
                              {reversingId === imp.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <RotateCcw size={14} />
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
        </div>

        {/* STEP 0: Upload File */}
        {step === 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Step 1: Upload Your Client List</h2>
              <p className="text-slate-500">Upload a CSV file with your client data</p>
            </div>

            {/* Download Template Button */}
            <div className="flex justify-center mb-6">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition border border-indigo-200"
              >
                <Download size={18} />
                Download Sample Template
              </button>
            </div>

            {/* Drag and Drop Zone */}
            <div
              className={`relative border-2 border-dashed rounded-2xl p-12 transition-all cursor-pointer ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
              }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={onFile}
                className="hidden"
              />

              <div className="flex flex-col items-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all ${
                  isDragging ? 'bg-indigo-100' : 'bg-gray-100'
                }`}>
                  <FileSpreadsheet className={`w-10 h-10 ${isDragging ? 'text-indigo-600' : 'text-gray-400'}`} />
                </div>

                <div className="text-lg font-medium text-slate-700 mb-1">
                  {isDragging ? 'Drop your file here!' : 'Drag & drop your CSV file here'}
                </div>
                <div className="text-sm text-slate-500 mb-4">or click to browse</div>

                <div className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition">
                  Select File
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-8 bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-start gap-3">
                <Info className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
                <div className="text-sm text-blue-900">
                  <div className="font-semibold mb-2">Tips for a smooth import:</div>
                  <ul className="space-y-1 list-disc list-inside text-blue-800">
                    <li>Make sure your file has a <b>header row</b> with column names</li>
                    <li>Include <b>Effective Date</b> for retention tracking features</li>
                    <li>Include <b>Email</b> to avoid duplicate imports</li>
                    <li>Dates should be in MM/DD/YYYY format</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Map Columns */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Step 2: Map Your Columns</h2>
              <p className="text-slate-500">
                Tell us which columns in your file match our fields
                {mappedCount > 0 && <span className="text-green-600 ml-2">({mappedCount} auto-mapped!)</span>}
              </p>
            </div>

            {/* File Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl flex items-center gap-4">
              <FileCheck className="text-green-600" size={24} />
              <div>
                <div className="font-medium text-slate-800">{file?.name}</div>
                <div className="text-sm text-slate-500">{rows.length} rows found • {headers.length} columns</div>
              </div>
              <button
                onClick={() => { setStep(0); setFile(null); setHeaders([]); setRows([]); }}
                className="ml-auto text-sm text-indigo-600 hover:underline"
              >
                Choose different file
              </button>
            </div>

            {/* Auto-mapped indicator */}
            {mappedCount > 0 && (
              <div className="mb-6 p-3 bg-green-50 rounded-lg border border-green-200 flex items-center gap-2">
                <Sparkles className="text-green-600" size={18} />
                <span className="text-green-800 text-sm font-medium">
                  We automatically mapped {mappedCount} fields! Review them below.
                </span>
              </div>
            )}

            {/* Required Fields */}
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-sm font-bold text-red-600 mb-3">
                <Shield size={16} /> Required Fields
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {FIELD_GROUPS.required.map(({ key, label, desc }) => (
                  <MappingField
                    key={key}
                    field={key}
                    label={label}
                    desc={desc}
                    headers={headers}
                    value={map[key]}
                    onChange={onChangeMap}
                    required
                  />
                ))}
              </div>
            </div>

            {/* Critical Fields */}
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-sm font-bold text-amber-600 mb-3">
                <AlertTriangle size={16} /> Critical for Retention Tracking
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {FIELD_GROUPS.policy.filter(f => f.critical).map(({ key, label, desc }) => (
                  <MappingField
                    key={key}
                    field={key}
                    label={label}
                    desc={desc}
                    headers={headers}
                    value={map[key]}
                    onChange={onChangeMap}
                    critical
                  />
                ))}
                {FIELD_GROUPS.contact.map(({ key, label, desc }) => (
                  <MappingField
                    key={key}
                    field={key}
                    label={label}
                    desc={desc}
                    headers={headers}
                    value={map[key]}
                    onChange={onChangeMap}
                  />
                ))}
              </div>
            </div>

            {/* Default Carrier - Show if no carrier column is mapped */}
            {map.carrier == null && (
              <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                <div className="flex items-start gap-3">
                  <Info className="text-indigo-600 mt-0.5 flex-shrink-0" size={20} />
                  <div className="flex-1">
                    <h4 className="font-semibold text-indigo-900 mb-2">
                      No Carrier Column Found
                    </h4>
                    <p className="text-sm text-indigo-800 mb-3">
                      Is this entire book from one carrier? Select a default carrier to apply to all imported clients:
                    </p>
                    <select
                      className="w-full md:w-64 border border-indigo-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={defaultCarrier}
                      onChange={(e) => setDefaultCarrier(e.target.value)}
                    >
                      <option value="">— No default carrier —</option>
                      {CARRIERS.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {defaultCarrier && (
                      <p className="text-xs text-indigo-600 mt-2 flex items-center gap-1">
                        <Check size={14} /> All clients will be assigned to <b>{defaultCarrier}</b>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Show More Fields */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 mb-4"
            >
              {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showAdvanced ? 'Hide' : 'Show'} additional fields ({FIELD_GROUPS.policy.filter(f => !f.critical).length + FIELD_GROUPS.personal.length + FIELD_GROUPS.other.length} more)
            </button>

            {showAdvanced && (
              <>
                {/* Policy Fields */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-slate-600 mb-3">Policy Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {FIELD_GROUPS.policy.filter(f => !f.critical).map(({ key, label, desc }) => (
                      <MappingField
                        key={key}
                        field={key}
                        label={label}
                        desc={desc}
                        headers={headers}
                        value={map[key]}
                        onChange={onChangeMap}
                      />
                    ))}
                  </div>
                </div>

                {/* Personal Fields */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-slate-600 mb-3">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {FIELD_GROUPS.personal.map(({ key, label, desc }) => (
                      <MappingField
                        key={key}
                        field={key}
                        label={label}
                        desc={desc}
                        headers={headers}
                        value={map[key]}
                        onChange={onChangeMap}
                      />
                    ))}
                  </div>
                </div>

                {/* Other Fields */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-slate-600 mb-3">Other</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {FIELD_GROUPS.other.map(({ key, label, desc }) => (
                      <MappingField
                        key={key}
                        field={key}
                        label={label}
                        desc={desc}
                        headers={headers}
                        value={map[key]}
                        onChange={onChangeMap}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Remember mapping */}
            <label className="flex items-center gap-2 text-sm text-slate-600 mt-4">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded"
              />
              Remember this mapping for future imports
            </label>

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <button
                onClick={() => setStep(0)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
              >
                <ArrowLeft size={18} />
                Back
              </button>
              <button
                onClick={() => goToStep(2)}
                disabled={!hasName}
                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Review Data
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Review Data */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Step 3: Review Your Data</h2>
              <p className="text-slate-500">Make sure everything looks correct before importing</p>
            </div>

            {/* Validation Issues */}
            {validationIssues.length > 0 && (
              <div className="mb-6 space-y-2">
                {validationIssues.map((issue, idx) => (
                  <div key={idx} className={`p-3 rounded-lg flex items-start gap-2 ${
                    issue.type === 'error'
                      ? 'bg-red-50 border border-red-200 text-red-800'
                      : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                  }`}>
                    {issue.type === 'error' ? <X size={18} /> : <AlertTriangle size={18} />}
                    <span className="text-sm">{issue.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-indigo-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-indigo-600">{rows.length}</div>
                <div className="text-sm text-indigo-800">Total Clients</div>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{mappedCount}</div>
                <div className="text-sm text-green-800">Fields Mapped</div>
              </div>
              <div className={`rounded-xl p-4 text-center ${hasEffectiveDate ? 'bg-green-50' : 'bg-yellow-50'}`}>
                <div className={`text-3xl font-bold ${hasEffectiveDate ? 'text-green-600' : 'text-yellow-600'}`}>
                  {hasEffectiveDate ? <Check size={32} className="mx-auto" /> : <AlertTriangle size={32} className="mx-auto" />}
                </div>
                <div className={`text-sm ${hasEffectiveDate ? 'text-green-800' : 'text-yellow-800'}`}>
                  {hasEffectiveDate ? 'Retention Ready' : 'No Effective Date'}
                </div>
              </div>
            </div>

            {/* Preview Table */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Eye size={16} /> Preview (First 5 Rows)
              </h3>
              <div className="overflow-auto border rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left border-b font-medium text-slate-600">Name</th>
                      <th className="px-3 py-2 text-left border-b font-medium text-slate-600">Contact</th>
                      <th className="px-3 py-2 text-left border-b font-medium text-slate-600">Effective Date</th>
                      <th className="px-3 py-2 text-left border-b font-medium text-slate-600">Carrier</th>
                      <th className="px-3 py-2 text-left border-b font-medium text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, idx) => (
                      <tr key={idx} className="odd:bg-white even:bg-slate-50/50">
                        <td className="px-3 py-2 border-b">
                          <span className="font-medium">{row.firstName} {row.lastName}</span>
                        </td>
                        <td className="px-3 py-2 border-b text-slate-600">
                          {row.email || row.phone || <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-3 py-2 border-b">
                          {row.effectiveDate || <span className="text-yellow-600">Not provided</span>}
                        </td>
                        <td className="px-3 py-2 border-b text-slate-600">
                          {row.carrier ? (
                            <span className={defaultCarrier && row.carrier === defaultCarrier && map.carrier == null ? 'text-indigo-600 font-medium' : ''}>
                              {row.carrier}
                              {defaultCarrier && row.carrier === defaultCarrier && map.carrier == null && (
                                <span className="text-xs text-indigo-400 ml-1">(default)</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 border-b">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            row.status === 'active' ? 'bg-green-100 text-green-800' :
                            row.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {row.status || 'active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 5 && (
                <div className="text-center text-sm text-slate-500 mt-2">
                  ...and {rows.length - 5} more rows
                </div>
              )}
            </div>

            {/* Duplicate Handling Info */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-start gap-3">
                <Info className="text-blue-600 mt-0.5 flex-shrink-0" size={18} />
                <div className="text-sm text-blue-900">
                  <b>Duplicate handling:</b> If a client with the same <u>phone number</u> or <u>email</u> already exists, their record will be updated with the new data instead of creating a duplicate. Phone number is checked first since not every client has an email.
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
              >
                <ArrowLeft size={18} />
                Back to Mapping
              </button>
              <button
                onClick={onImport}
                disabled={importing || validationIssues.some(i => i.type === 'error')}
                className="flex items-center gap-2 px-8 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
              >
                {importing ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Import {rows.length} Clients
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Success */}
        {step === 3 && importResult && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">Import Complete!</h2>
            <p className="text-slate-600 mb-8">Your clients have been successfully imported</p>

            {/* Results */}
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
              <div className="bg-green-50 rounded-xl p-4">
                <div className="text-3xl font-bold text-green-600">{importResult.added}</div>
                <div className="text-sm text-green-800">Added</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="text-3xl font-bold text-blue-600">{importResult.updated}</div>
                <div className="text-sm text-blue-800">Updated</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-3xl font-bold text-gray-600">{importResult.skipped}</div>
                <div className="text-sm text-gray-800">Skipped</div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-indigo-50 rounded-xl p-6 text-left max-w-lg mx-auto mb-8">
              <h3 className="font-semibold text-indigo-900 mb-3">What's Next?</h3>
              <ul className="space-y-2 text-sm text-indigo-800">
                <li className="flex items-start gap-2">
                  <Check size={16} className="text-indigo-600 mt-0.5" />
                  View your updated client list
                </li>
                <li className="flex items-start gap-2">
                  <Check size={16} className="text-indigo-600 mt-0.5" />
                  Check the Dashboard for retention insights
                </li>
                <li className="flex items-start gap-2">
                  <Check size={16} className="text-indigo-600 mt-0.5" />
                  Set up OEP automations for your cohort
                </li>
              </ul>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => nav("/clients")}
                className="px-6 py-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition font-semibold"
              >
                View Clients
              </button>
              <button
                onClick={() => nav("/dashboard")}
                className="px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Mapping field component
function MappingField({ field, label, desc, headers, value, onChange, required, critical }) {
  const isMapped = value != null && value !== '';

  return (
    <div className={`rounded-xl p-4 border transition ${
      required
        ? isMapped ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        : critical
          ? isMapped ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
          : isMapped ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {isMapped && <Check size={16} className="text-green-600" />}
      </div>
      <select
        className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
        value={value ?? ""}
        onChange={(e) => onChange(field, e.target.value)}
      >
        <option value="">— Select column —</option>
        {headers.map((h, i) => (
          <option key={i} value={i}>
            {i + 1}. {h}
          </option>
        ))}
      </select>
      <div className="text-xs text-slate-500 mt-2">{desc}</div>
    </div>
  );
}
