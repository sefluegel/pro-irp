import React, { useState, useEffect } from "react";

// Demo: Language, States, Carriers/Plans, Zips/Carrier mapping
const ISO_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "vi", name: "Vietnamese" },
];
const STATES = ["KY", "OH", "IN", "FL", "PA", "TX", "GA", "TN"];

// Demo: available carriers by zip (zip => carrier ids)
const ZIP_CARRIER = {
  "41048": ["uhc", "humana"],
  "45202": ["aetna", "uhc"],
  "41001": ["aetna", "humana"]
};

const CARRIERS = [
  {
    id: "uhc",
    name: "UnitedHealthcare",
    plans: {
      "41048": [
        { id: "uhc1", name: "UHC Secure Advantage" },
        { id: "uhc2", name: "UHC Choice Plus" }
      ],
      "45202": [
        { id: "uhc3", name: "UHC Gold Value" },
        { id: "uhc4", name: "UHC Core Essential" }
      ]
    }
  },
  {
    id: "aetna",
    name: "Aetna",
    plans: {
      "41001": [
        { id: "aetna1", name: "Aetna Medicare Premier" },
        { id: "aetna2", name: "Aetna PPO Value" }
      ],
      "45202": [
        { id: "aetna3", name: "Aetna Choice" },
        { id: "aetna4", name: "Aetna Secure HMO" }
      ]
    }
  },
  {
    id: "humana",
    name: "Humana",
    plans: {
      "41048": [
        { id: "hum1", name: "Humana Gold Plus" },
        { id: "hum2", name: "Humana Value Plan" }
      ],
      "41001": [
        { id: "hum3", name: "Humana Care Advantage" },
        { id: "hum4", name: "Humana Choice PPO" }
      ]
    }
  }
];

// Helper to get available carriers for entered zip
const getCarriersForZip = zip => ZIP_CARRIER[zip] || [];

const ClientForm = ({ client, onSave, onCancel }) => {
  // Form state
  const [name, setName] = useState(client?.name || "");
  const [dob, setDob] = useState(client?.dob || "");
  const [email, setEmail] = useState(client?.email || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [address, setAddress] = useState(client?.address || "");
  const [city, setCity] = useState(client?.city || "");
  const [state, setState] = useState(client?.state || "KY");
  const [zip, setZip] = useState(client?.zip || "");
  const [effectiveDate, setEffectiveDate] = useState(client?.effectiveDate || "");
  const [preferredLanguage, setPreferredLanguage] = useState(client?.preferredLanguage || "en");
  const [primaryCare, setPrimaryCare] = useState(client?.primaryCare || "");
  const [specialists, setSpecialists] = useState(client?.specialists || "");
  const [medications, setMedications] = useState(client?.medications || "");
  const [carrier, setCarrier] = useState(client?.carrier || "");
  const [plan, setPlan] = useState(client?.plan || "");

  // Upload fields (fake for demo: { fileName, date })
  const [soa, setSoa] = useState(client?.soa || null);
  const [ptc, setPtc] = useState(client?.ptc || null);
  const [enrollment, setEnrollment] = useState(client?.enrollment || null);
  const [otherPolicies, setOtherPolicies] = useState(client?.otherPolicies || []);

  // Filter carriers/plans by zip
  const availableCarrierIds = getCarriersForZip(zip);
  const availableCarriers = CARRIERS.filter(c => availableCarrierIds.includes(c.id));
  const availablePlans = carrier && zip
    ? (CARRIERS.find(c => c.id === carrier)?.plans[zip] || [])
    : [];

  // Reset carrier/plan if zip or carrier changes
  useEffect(() => {
    if (!availableCarrierIds.includes(carrier)) setCarrier("");
    if (!availablePlans.find(p => p.id === plan)) setPlan("");
    // eslint-disable-next-line
  }, [zip, carrier]);

  // Demo "upload" handler
  const handleUpload = (e, setter) => {
    if (e.target.files && e.target.files[0]) {
      setter({
        fileName: e.target.files[0].name,
        date: new Date().toLocaleDateString(),
      });
    }
  };

  // Demo: add another policy upload
  const handleAddPolicy = e => {
    if (e.target.files && e.target.files[0]) {
      setOtherPolicies(pols => [
        ...pols,
        {
          fileName: e.target.files[0].name,
          date: new Date().toLocaleDateString(),
        }
      ]);
    }
  };

  const handleSubmit = e => {
    e.preventDefault();
    onSave({
      ...client,
      name, dob, email, phone, address, city, state, zip, effectiveDate,
      preferredLanguage, primaryCare, specialists, medications,
      carrier, plan, soa, ptc, enrollment, otherPolicies,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-extrabold text-[#172A3A] mb-4">
        {client ? "Edit Client" : "Add Client"}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column 1 */}
        <div>
          <label className="block text-sm font-bold mb-1 text-[#20344A]">Name</label>
          <input className="w-full border p-2 rounded mb-4" value={name} onChange={e => setName(e.target.value)} required />

          <label className="block text-sm font-bold mb-1 text-[#20344A]">Date of Birth</label>
          <input className="w-full border p-2 rounded mb-4" type="date" value={dob} onChange={e => setDob(e.target.value)} />

          <label className="block text-sm font-bold mb-1 text-[#20344A]">Email</label>
          <input className="w-full border p-2 rounded mb-4" type="email" value={email} onChange={e => setEmail(e.target.value)} />

          <label className="block text-sm font-bold mb-1 text-[#20344A]">Phone</label>
          <input className="w-full border p-2 rounded mb-4" value={phone} onChange={e => setPhone(e.target.value)} />

          <label className="block text-sm font-bold mb-1 text-[#20344A]">Street Address</label>
          <input className="w-full border p-2 rounded mb-2" value={address} onChange={e => setAddress(e.target.value)} />
          <div className="flex gap-2 mb-4">
            <input className="border p-2 rounded w-1/2" value={city} onChange={e => setCity(e.target.value)} placeholder="City" />
            <select className="border p-2 rounded w-1/4" value={state} onChange={e => setState(e.target.value)}>
              {STATES.map(s => <option key={s}>{s}</option>)}
            </select>
            <input className="border p-2 rounded w-1/4" value={zip} onChange={e => setZip(e.target.value)} placeholder="Zip" />
          </div>

          <label className="block text-sm font-bold mb-1 text-[#20344A]">Effective Date</label>
          <input className="w-full border p-2 rounded mb-4" type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
        </div>
        {/* Column 2 */}
        <div>
          <label className="block text-sm font-bold mb-1 text-[#20344A]">Preferred Language</label>
          <select className="w-full border p-2 rounded mb-4" value={preferredLanguage} onChange={e => setPreferredLanguage(e.target.value)}>
            {ISO_LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
          </select>

          <label className="block text-sm font-bold mb-1 text-[#20344A]">Primary Care Doctor</label>
          <input className="w-full border p-2 rounded mb-4" value={primaryCare} onChange={e => setPrimaryCare(e.target.value)} />

          <label className="block text-sm font-bold mb-1 text-[#20344A]">Specialist(s)</label>
          <input className="w-full border p-2 rounded mb-4" value={specialists} onChange={e => setSpecialists(e.target.value)} placeholder="Comma separated" />

          <label className="block text-sm font-bold mb-1 text-[#20344A]">Medications</label>
          <input className="w-full border p-2 rounded mb-4" value={medications} onChange={e => setMedications(e.target.value)} placeholder="Comma separated" />

          <label className="block text-sm font-bold mb-1 text-[#20344A]">Carrier</label>
          <select className="w-full border p-2 rounded mb-4"
            value={carrier} onChange={e => setCarrier(e.target.value)} disabled={!zip}>
            <option value="">Select Carrier</option>
            {availableCarriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <label className="block text-sm font-bold mb-1 text-[#20344A]">Plan</label>
          <select className="w-full border p-2 rounded mb-4"
            value={plan} onChange={e => setPlan(e.target.value)} disabled={!carrier || !zip}>
            <option value="">Select Plan</option>
            {availablePlans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
      {/* Uploads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        <div>
          <label className="block text-sm font-bold mb-1 text-[#20344A]">Upload SOA Form</label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="mb-2"
            onChange={e => handleUpload(e, setSoa)} />
          {soa && <div className="text-green-700 text-sm">File: {soa.fileName} ({soa.date})</div>}

          <label className="block text-sm font-bold mb-1 text-[#20344A] mt-4">Permission to Contact</label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="mb-2"
            onChange={e => handleUpload(e, setPtc)} />
          {ptc && <div className="text-green-700 text-sm">File: {ptc.fileName} ({ptc.date})</div>}

          <label className="block text-sm font-bold mb-1 text-[#20344A] mt-4">Enrollment Form</label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="mb-2"
            onChange={e => handleUpload(e, setEnrollment)} />
          {enrollment && <div className="text-green-700 text-sm">File: {enrollment.fileName} ({enrollment.date})</div>}
        </div>
        <div>
          <label className="block text-sm font-bold mb-1 text-[#20344A]">Upload Other Policy Docs</label>
          <input type="file" multiple className="mb-2"
            onChange={handleAddPolicy} />
          <ul className="list-disc ml-5 text-green-700 text-sm">
            {otherPolicies && otherPolicies.length > 0 &&
              otherPolicies.map((p, i) => <li key={i}>{p.fileName} ({p.date})</li>)
            }
          </ul>
        </div>
      </div>
      {/* Buttons */}
      <div className="flex gap-4 justify-end mt-8">
        <button type="button"
          className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition"
          onClick={onCancel}>
          Cancel
        </button>
        <button type="submit"
          className="px-5 py-2 rounded bg-[#FFB800] text-[#172A3A] font-bold hover:bg-yellow-400 transition">
          Save
        </button>
      </div>
    </form>
  );
};

export default ClientForm;
