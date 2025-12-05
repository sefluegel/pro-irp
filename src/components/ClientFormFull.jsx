// src/components/ClientFormFull.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { formatPhoneE164, formatDateForInput } from "../utils/formatters";
import { parseEnrollmentPdf } from "../api";


const CARRIERS = ["Aetna","Alignment Health Plan","Allwell","Amerigroup","Anthem Blue Cross Blue Shield","Asuris Northwest Health","Aultcare","Avera Health Plans","AvMed","Banner Health","BCBS of Alabama","BCBS of Arizona","BCBS of Arkansas","BCBS of Delaware","BCBS of Florida (Florida Blue)","BCBS of Georgia","BCBS of Hawaii","BCBS of Idaho","BCBS of Illinois","BCBS of Indiana","BCBS of Iowa","BCBS of Kansas","BCBS of Kansas City","BCBS of Louisiana","BCBS of Maine","BCBS of Massachusetts","BCBS of Michigan","BCBS of Minnesota","BCBS of Mississippi","BCBS of Montana","BCBS of Nebraska","BCBS of New Mexico","BCBS of North Carolina","BCBS of North Dakota","BCBS of Oklahoma","BCBS of Rhode Island","BCBS of South Carolina","BCBS of Tennessee","BCBS of Texas","BCBS of Vermont","BCBS of Wyoming","Blue Cross Blue Shield","Blue Shield of California","Bright Health","Capital Health Plan","Care N Care","Care Plus Health Plans","CareFirst BCBS","CareMore Health","CareOregon","CareSource","Cariten Health Plan","Centene","Centennial Care","Central Health Plan","Chinese Community Health Plan","CHRISTUS Health Plan","Cigna","Clover Health","Community Health Choice","Community Health Plan of Washington","Coventry Health Care","Dean Health Plan","Denver Health Medical Plan","Devoted Health","Elderplan","Emblem Health","EmblemHealth","Empire BCBS","Envision Healthcare","Essence Healthcare","Excellus BCBS","Fallon Health","Fidelis Care","First Health Part D","Florida Blue","Geisinger Health Plan","Global Health","Golden Rule Insurance","Group Health Cooperative","HAP (Health Alliance Plan)","Harvard Pilgrim Health Care","Health Alliance","Health First Health Plans","Health Net","Health New England","Health Partners","Health Plan of Nevada","Health Plan of San Joaquin","Health Plan of San Mateo","HealthMarkets","HealthPartners","HealthPlus of Michigan","HealthSpring","HealthSun Health Plans","Highmark BCBS","Highmark Delaware","Highmark West Virginia","Horizon BCBS of New Jersey","Humana","IEHP (Inland Empire Health Plan)","Independence Blue Cross","Independent Health","InnovAge","Integra Health","Kaiser Permanente","Kaiser Permanente Colorado","Kaiser Permanente Georgia","Kaiser Permanente Hawaii","Kaiser Permanente Mid-Atlantic","Kaiser Permanente Northern California","Kaiser Permanente Northwest","Kaiser Permanente Southern California","Kaiser Permanente Washington","L.A. Care Health Plan","Lasso Healthcare","Leon Health","Longevity Health Plan","Louisiana Healthcare Connections","Martin's Point Health Care","Medica","Medical Associates Health Plan","Medical Mutual of Ohio","MedicareBlue Rx","Medigold","Mercy Care","Mercy Health Plans","Meridian Health Plan","Molina Healthcare","MolinaHealthcare","Mount Carmel Health Plan","MVP Health Care","Neighborhood Health Plan","Network Health","Nova Healthcare","Oscar Health","Oxford Health Plans","PACE","PacificSource Health Plans","Paramount Insurance","Passport Health Plan","Peoples Health","Physicians Health Plan","Physicians Mutual","Piedmont Community Health Plan","Premera Blue Cross","Presbyterian Health Plan","Priority Health","Providence Health Plan","Quartz Health Solutions","Regence BlueCross BlueShield","Regence BlueShield of Idaho","Rocky Mountain Health Plans","SCAN Health Plan","Scott and White Health Plan","Secure Horizons","Security Health Plan","SelectCare","SelectHealth","SelectQuote","Sendero Health Plans","SilverScript","SilverSummit Health Plan","Simply Healthcare","Solis Health Plans","Soundpath Health","Sparrow PHP","Summa Care","SummaCare","Sunshine Health","Superior HealthPlan","TEFRA","Total Health Care","Touchstone Health","Tufts Health Plan","UCare","UHCP (University Health Care Plans)","Umpqua Health","UniCare","United American Insurance","UnitedHealthcare","UPMC Health Plan","US Health and Life","Vantage Health Plan","VillageMD","Virginia Premier Health Plan","Vista Health Plan","Vivida Health","WellCare","WellMed","Western Health Advantage","Windsor Health Plan","Other"];
const PLAN_TYPES = ["Medicare Advantage (Part C)", "Medicare Supplement (Medigap)", "Prescription Drug Plan (Part D)", "Special Needs Plan (SNP)", "Medicare Savings Program", "Original Medicare", "Other"];
const MEDICATIONS = ["Abilify","Actos","Adderall","Advair","Albuterol","Allegra","Alprazolam","Ambien","Amlodipine","Amoxicillin","Aspirin","Atenolol","Atorvastatin","Ativan","Azithromycin","Carvedilol","Celebrex","Celexa","Cipro","Citalopram","Claritin","Clonazepam","Clopidogrel","Coumadin","Crestor","Cymbalta","Diazepam","Digoxin","Diltiazem","Doxycycline","Duloxetine","Effexor","Eliquis","Enalapril","Entresto","Escitalopram","Esomeprazole","Farxiga","Finasteride","Flomax","Fluoxetine","Furosemide","Gabapentin","Glipizide","Humira","Hydrochlorothiazide","Hydrocodone","Ibuprofen","Insulin","Januvia","Jardiance","Klonopin","Lamotrigine","Lantus","Lasix","Lexapro","Lisinopril","Loratadine","Lorazepam","Losartan","Lyrica","Meloxicam","Metformin","Metoprolol","Montelukast","Naproxen","Nexium","Norvasc","Omeprazole","Oxycodone","Ozempic","Pantoprazole","Paxil","Plavix","Prednisone","Prilosec","Prozac","Rosuvastatin","Seroquel","Sertraline","Simvastatin","Singulair","Spironolactone","Synthroid","Tamsulosin","Tramadol","Trazodone","Tylenol","Valium","Valsartan","Venlafaxine","Warfarin","Wellbutrin","Xanax","Xarelto","Zoloft","Zyrtec"];
const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

// Single-select autocomplete for carrier selection
function CarrierAutocomplete({ value, onChange, placeholder }) {
  const [inputValue, setInputValue] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => { setInputValue(value || ""); }, [value]);
  useEffect(() => {
    function handleClickOutside(e) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) && inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInputChange(e) {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    if (val.length >= 1) {
      const filtered = CARRIERS.filter(c => c.toLowerCase().includes(val.toLowerCase())).slice(0, 10);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  function selectCarrier(c) {
    setInputValue(c);
    onChange(c);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function handleFocus() {
    if (inputValue.length >= 1) {
      const filtered = CARRIERS.filter(c => c.toLowerCase().includes(inputValue.toLowerCase())).slice(0, 10);
      if (filtered.length > 0) setShowSuggestions(true);
    } else {
      setSuggestions(CARRIERS.slice(0, 10));
      setShowSuggestions(true);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && suggestions.length > 0) {
      e.preventDefault();
      selectCarrier(suggestions[0]);
    }
    if (e.key === "Escape") setShowSuggestions(false);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div ref={suggestionsRef} className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
          {suggestions.map((c, i) => (
            <button key={i} type="button" onClick={() => selectCarrier(c)} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0">{c}</button>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-500 mt-1">Type to search {CARRIERS.length - 1} carriers</p>
    </div>
  );
}

function MedicationAutocomplete({ value, onChange, placeholder }) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedMeds, setSelectedMeds] = useState([]);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => { if (value && typeof value === "string") setSelectedMeds(value.split(",").map(m => m.trim()).filter(Boolean)); }, []);
  useEffect(() => {
    function handleClickOutside(e) { if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) && inputRef.current && !inputRef.current.contains(e.target)) setShowSuggestions(false); }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInputChange(e) {
    const val = e.target.value;
    setInputValue(val);
    if (val.length >= 2) { const f = MEDICATIONS.filter(m => m.toLowerCase().startsWith(val.toLowerCase()) && !selectedMeds.includes(m)).slice(0, 8); setSuggestions(f); setShowSuggestions(f.length > 0); }
    else { setSuggestions([]); setShowSuggestions(false); }
  }
  function selectMed(m) { const n = [...selectedMeds, m]; setSelectedMeds(n); onChange(n.join(", ")); setInputValue(""); setSuggestions([]); setShowSuggestions(false); inputRef.current?.focus(); }
  function removeMed(m) { const n = selectedMeds.filter(x => x !== m); setSelectedMeds(n); onChange(n.join(", ")); }
  function handleKeyDown(e) {
    if (e.key === "Enter" && inputValue.trim()) { e.preventDefault(); const n = [...selectedMeds, inputValue.trim()]; setSelectedMeds(n); onChange(n.join(", ")); setInputValue(""); setShowSuggestions(false); }
    if (e.key === "Backspace" && !inputValue && selectedMeds.length > 0) removeMed(selectedMeds[selectedMeds.length - 1]);
  }

  return (
    <div className="relative">
      <div className="w-full border rounded-lg px-3 py-2 flex flex-wrap gap-1.5 min-h-[42px] focus-within:ring-2 focus-within:ring-blue-500 bg-white">
        {selectedMeds.map((m, i) => (<span key={i} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-sm">{m}<button type="button" onClick={() => removeMed(m)} className="hover:bg-blue-200 rounded-full p-0.5"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></span>))}
        <input ref={inputRef} type="text" className="flex-1 min-w-[120px] outline-none text-sm bg-transparent" value={inputValue} onChange={handleInputChange} onKeyDown={handleKeyDown} onFocus={() => inputValue.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)} placeholder={selectedMeds.length === 0 ? placeholder : "Add more..."} />
      </div>
      {showSuggestions && (<div ref={suggestionsRef} className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">{suggestions.map((m, i) => (<button key={i} type="button" onClick={() => selectMed(m)} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm">{m}</button>))}</div>)}
      <p className="text-xs text-gray-500 mt-1">Type to search, press Enter to add custom</p>
    </div>
  );
}

// Document upload drop zone component
function DocumentDropZone({ label, icon, accepted, onFile, isUploaded, isLoading, description }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };
  const handleClick = () => inputRef.current?.click();
  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all text-center ${
        isLoading ? 'border-blue-400 bg-blue-50' :
        isUploaded ? 'border-green-400 bg-green-50' :
        isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' :
        'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
      }`}
    >
      <input ref={inputRef} type="file" accept={accepted} onChange={handleChange} className="hidden" />

      {isLoading ? (
        <div className="flex flex-col items-center">
          <svg className="animate-spin w-8 h-8 text-blue-600 mb-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-blue-700">Processing...</span>
        </div>
      ) : isUploaded ? (
        <div className="flex flex-col items-center">
          <svg className="w-8 h-8 text-green-600 mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-green-700">{label}</span>
          <span className="text-xs text-green-600">Uploaded</span>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
            {icon}
          </div>
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-xs text-gray-500 mt-1">{description || 'Drop or click'}</span>
        </div>
      )}
    </div>
  );
}


export default function ClientFormFull({ initial, saving = false, onCancel, onSave }) {
  const { t } = useTranslation();
  const seed = (initial && typeof initial === "object") ? initial : {};

  const [form, setForm] = useState({
    firstName: seed.firstName || "",
    lastName: seed.lastName || "",
    phone: seed.phone || "",
    email: seed.email || "",
    address: seed.address || "",
    city: seed.city || "",
    state: seed.state || "",
    zip: seed.zip || "",
    county: seed.county || "",
    dob: formatDateForInput(seed.dob) || "",
    sex: seed.sex || "",
    ssn: seed.ssn || "",
    medicareId: seed.medicareId || "",
    partAEffectiveDate: formatDateForInput(seed.partAEffectiveDate) || "",
    partBEffectiveDate: formatDateForInput(seed.partBEffectiveDate) || "",
    effectiveDate: formatDateForInput(seed.effectiveDate) || "",
    preferredLanguage: seed.preferredLanguage || "en",
    carrier: seed.carrier || "",
    planType: seed.planType || "",
    plan: seed.plan || "",
    monthlyPremium: seed.monthlyPremium || "",
    primaryCare: seed.primaryCare || "",
    pcpId: seed.pcpId || "",
    specialists: seed.specialists || "",
    medications: seed.medications || "",
    soaOnFile: (seed.soa && !!seed.soa.onFile) || false,
    soaSigned: (seed.soa && seed.soa.signed) || "",
    ptcOnFile: (seed.ptc && !!seed.ptc.onFile) || false,
    ptcSigned: (seed.ptc && seed.ptc.signed) || "",
    enrollmentOnFile: (seed.enrollment && !!seed.enrollment.onFile) || false,
    notes: seed.notes || "",
  });

  // Upload states
  const [enrollmentUploaded, setEnrollmentUploaded] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [soaUploaded, setSoaUploaded] = useState(form.soaOnFile);
  const [ptcUploaded, setPtcUploaded] = useState(form.ptcOnFile);
  const [uploadError, setUploadError] = useState("");

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })); }
  function setMultiple(updates) { setForm(prev => ({ ...prev, ...updates })); }

  function handlePhoneBlur() {
    if (form.phone) {
      const formatted = formatPhoneE164(form.phone);
      set("phone", formatted);
    }
  }

  // Handle enrollment PDF upload - parses and fills form
  const handleEnrollmentUpload = useCallback(async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError("Please upload a PDF file");
      return;
    }

    try {
      setUploadError("");
      setEnrollmentLoading(true);

      const result = await parseEnrollmentPdf(file);

      if (result && result.data) {
        const updates = {};
        for (const [key, value] of Object.entries(result.data)) {
          if (value !== null && value !== undefined && value !== '') {
            updates[key] = value;
          }
        }
        updates.enrollmentOnFile = true;
        setMultiple(updates);
        setEnrollmentUploaded(true);
      }
    } catch (e) {
      setUploadError(e?.message || "Failed to parse enrollment PDF");
    } finally {
      setEnrollmentLoading(false);
    }
  }, []);

  // Handle SOA upload - just marks as on file
  const handleSoaUpload = useCallback((file) => {
    if (!file) return;
    const today = new Date().toISOString().split('T')[0];
    setMultiple({ soaOnFile: true, soaSigned: today });
    setSoaUploaded(true);
  }, []);

  // Handle PTC upload - just marks as on file
  const handlePtcUpload = useCallback((file) => {
    if (!file) return;
    const today = new Date().toISOString().split('T')[0];
    setMultiple({ ptcOnFile: true, ptcSigned: today });
    setPtcUploaded(true);
  }, []);

  function submit(e) {
    e.preventDefault();
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      phone: formatPhoneE164(form.phone),
      email: form.email,
      address: form.address,
      city: form.city,
      state: form.state,
      zip: form.zip,
      county: form.county,
      dob: form.dob,
      sex: form.sex,
      ssn: form.ssn,
      medicareId: form.medicareId,
      partAEffectiveDate: form.partAEffectiveDate,
      partBEffectiveDate: form.partBEffectiveDate,
      effectiveDate: form.effectiveDate,
      preferredLanguage: form.preferredLanguage,
      carrier: form.carrier,
      planType: form.planType,
      plan: form.plan,
      monthlyPremium: form.monthlyPremium ? parseFloat(form.monthlyPremium) : null,
      primaryCare: form.primaryCare,
      pcpId: form.pcpId,
      specialists: form.specialists,
      medications: form.medications,
      notes: form.notes,
      soa: { onFile: !!form.soaOnFile, signed: form.soaSigned || "" },
      ptc: { onFile: !!form.ptcOnFile, signed: form.ptcSigned || "" },
      enrollment: { onFile: !!form.enrollmentOnFile },
    };
    onSave && onSave(payload);
  }

  const ic = "w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const sc = "w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  return (
    <div className="flex flex-col max-h-[calc(100vh-200px)]">
      <div className="flex-1 overflow-y-auto pr-2">
        <form onSubmit={submit} id="client-form" className="space-y-6">

          {/* === DOCUMENT UPLOAD SECTION === */}
          <div className="border-b pb-5">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Upload Documents</h3>
            <p className="text-sm text-gray-600 mb-4">Drag & drop or click to upload. Enrollment PDF will auto-fill the form below.</p>

            {uploadError && (
              <div className="mb-4 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-200 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {uploadError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DocumentDropZone
                label="Enrollment Form"
                description="Auto-fills form"
                accepted=".pdf,application/pdf"
                onFile={handleEnrollmentUpload}
                isUploaded={enrollmentUploaded}
                isLoading={enrollmentLoading}
                icon={
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
              <DocumentDropZone
                label="Scope of Appointment"
                description="SOA form"
                accepted=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
                onFile={handleSoaUpload}
                isUploaded={soaUploaded}
                isLoading={false}
                icon={
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                }
              />
              <DocumentDropZone
                label="Permission to Contact"
                description="PTC form"
                accepted=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
                onFile={handlePtcUpload}
                isUploaded={ptcUploaded}
                isLoading={false}
                icon={
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* === PERSONAL INFORMATION === */}
          <div className="border-b pb-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-700 mb-1">{t('firstName')} *</label>
                <input className={ic} value={form.firstName} onChange={(e)=>set("firstName", e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">{t('lastName')} *</label>
                <input className={ic} value={form.lastName} onChange={(e)=>set("lastName", e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-700 mb-1">{t('dob')}</label>
                <input type="date" className={ic} value={form.dob} onChange={(e)=>set("dob", e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Sex</label>
                <select className={sc} value={form.sex} onChange={(e)=>set("sex", e.target.value)}>
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">{t('preferredLanguage')}</label>
                <select className={sc} value={form.preferredLanguage} onChange={(e)=>set("preferredLanguage", e.target.value)}>
                  <option value="en">{t('englishFlag')}</option>
                  <option value="es">{t('spanishFlag')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* === CONTACT INFORMATION === */}
          <div className="border-b pb-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-700 mb-1">{t('phone')}</label>
                <input className={ic} value={form.phone} onChange={(e)=>set("phone", e.target.value)} onBlur={handlePhoneBlur} placeholder="(555) 123-4567" />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">{t('emailLabel')}</label>
                <input type="email" className={ic} value={form.email} onChange={(e)=>set("email", e.target.value)} placeholder="email@example.com" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-slate-700 mb-1">Street Address</label>
              <input className={ic} value={form.address} onChange={(e)=>set("address", e.target.value)} placeholder="123 Main St Apt 101" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-slate-700 mb-1">City</label>
                <input className={ic} value={form.city} onChange={(e)=>set("city", e.target.value)} placeholder="City" />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">County</label>
                <input className={ic} value={form.county} onChange={(e)=>set("county", e.target.value)} placeholder="County" />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">State</label>
                <select className={sc} value={form.state} onChange={(e)=>set("state", e.target.value)}>
                  <option value="">Select</option>
                  {US_STATES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">ZIP</label>
                <input className={ic} value={form.zip} onChange={(e)=>set("zip", e.target.value)} placeholder="12345" maxLength={10} />
              </div>
            </div>
          </div>

          {/* === MEDICARE INFORMATION === */}
          <div className="border-b pb-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Medicare Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-700 mb-1">Medicare ID (MBI)</label>
                <input className={ic} value={form.medicareId} onChange={(e)=>set("medicareId", e.target.value.toUpperCase())} placeholder="1A23B45CD67" maxLength={11} />
                <p className="text-xs text-gray-500 mt-1">11-character Medicare Beneficiary Identifier</p>
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Social Security Number</label>
                <input className={ic} value={form.ssn} onChange={(e)=>set("ssn", e.target.value)} placeholder="XXX-XX-XXXX" maxLength={11} />
                <p className="text-xs text-gray-500 mt-1">Optional - stored securely</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-700 mb-1">Part A Effective Date</label>
                <input type="date" className={ic} value={form.partAEffectiveDate} onChange={(e)=>set("partAEffectiveDate", e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Part B Effective Date</label>
                <input type="date" className={ic} value={form.partBEffectiveDate} onChange={(e)=>set("partBEffectiveDate", e.target.value)} />
              </div>
            </div>
          </div>

          {/* === PLAN INFORMATION === */}
          <div className="border-b pb-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Plan Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-700 mb-1">{t('carrier')}</label>
                <CarrierAutocomplete value={form.carrier} onChange={(val) => set("carrier", val)} placeholder="Start typing carrier name..." />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Plan Type</label>
                <input className={ic} value={form.planType} onChange={(e)=>set("planType", e.target.value)} placeholder="e.g. Medicare Advantage, HMO" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-700 mb-1">{t('plan')} (Name)</label>
                <input className={ic} value={form.plan} onChange={(e)=>set("plan", e.target.value)} placeholder="Plan name" />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">{t('effectiveDate')}</label>
                <input type="date" className={ic} value={form.effectiveDate} onChange={(e)=>set("effectiveDate", e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Monthly Premium</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input type="number" step="0.01" min="0" className={ic + " pl-7"} value={form.monthlyPremium} onChange={(e)=>set("monthlyPremium", e.target.value)} placeholder="0.00" />
                </div>
              </div>
            </div>
          </div>

          {/* === HEALTHCARE PROVIDERS === */}
          <div className="border-b pb-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Healthcare Providers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-slate-700 mb-1">{t('primaryCare')}</label>
                <input className={ic} value={form.primaryCare} onChange={(e)=>set("primaryCare", e.target.value)} placeholder="Dr. Name" />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">PCP ID/NPI</label>
                <input className={ic} value={form.pcpId} onChange={(e)=>set("pcpId", e.target.value)} placeholder="Provider ID or NPI" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">{t('specialists')}</label>
              <input className={ic} value={form.specialists} onChange={(e)=>set("specialists", e.target.value)} placeholder="Cardiologist, Endocrinologist, etc." />
            </div>
          </div>

          {/* === MEDICATIONS === */}
          <div className="border-b pb-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Medications</h3>
            <MedicationAutocomplete value={form.medications} onChange={(val) => set("medications", val)} placeholder="Start typing medication name..." />
          </div>

          {/* === NOTES === */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Notes</h3>
            <textarea rows={3} className={ic} value={form.notes} onChange={(e)=>set("notes", e.target.value)} placeholder="Any additional notes about this client..." />
          </div>

        </form>
      </div>
      <div className="sticky bottom-0 bg-white border-t pt-4 mt-4 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 font-medium" disabled={saving}>{t("cancel")}</button>
        <button type="submit" form="client-form" className="px-6 py-2 text-sm rounded-lg bg-[#FFB800] text-[#172A3A] font-semibold hover:bg-[#e5a600] disabled:opacity-50 shadow-sm" disabled={saving}>{saving ? t("saving") : t("save")}</button>
      </div>
    </div>
  );
}
