// /frontend/src/components/ClientDetailCard.jsx
import React from "react";

const ClientDetailCard = ({ client }) => (
  <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 flex flex-col md:flex-row gap-12">
    {/* Left: Contact, carrier/plan, doctors */}
    <div className="flex-1 space-y-2 text-lg">
      <div><span className="font-bold">📅 DOB:</span> {client.dob}</div>
      <div><span className="font-bold">📧 Email:</span> {client.email}</div>
      <div><span className="font-bold">📞 Phone:</span> {client.phone}</div>
      <div>
        <span className="font-bold">🏠 Address:</span> {client.address}, {client.city}, {client.state} {client.zip}
      </div>
      <div><span className="font-bold">🗓️ Effective Date:</span> {client.effectiveDate}</div>
      <div><span className="font-bold">🗣️ Preferred Language:</span> {client.preferredLanguage}</div>
      <div><span className="font-bold">🏥 Carrier:</span> {client.carrier}</div>
      <div><span className="font-bold">💳 Plan:</span> {client.plan}</div>
      <div><span className="font-bold">👨‍⚕️ Primary Care:</span> {client.primaryCare}</div>
      <div><span className="font-bold">👩‍⚕️ Specialists:</span> {client.specialists}</div>
      <div><span className="font-bold">💊 Medications:</span> {client.medications}</div>
    </div>
    {/* Right: Uploads, SOA, Policies */}
    <div className="flex-1 space-y-3 text-lg">
      <div>
        <span className="font-bold">📄 SOA:</span>{" "}
        {client.soa?.onFile
          ? <span className="text-green-600 font-bold">On File ({client.soa.signed})</span>
          : <span className="text-red-600">Missing</span>
        }
      </div>
      <div>
        <span className="font-bold">📄 Permission to Contact:</span>{" "}
        {client.ptc?.onFile
          ? <span className="text-green-600 font-bold">On File ({client.ptc.signed})</span>
          : <span className="text-red-600">Missing</span>
        }
      </div>
      <div>
        <span className="font-bold">📝 Enrollment Form:</span>{" "}
        {client.enrollment?.onFile
          ? <span className="text-green-600 font-bold">On File</span>
          : <span className="text-red-600">Missing</span>
        }
      </div>
      <div>
        <span className="font-bold">📚 Policies:</span>{" "}
        {client.policies && client.policies.length
          ? (
            <ul className="list-disc ml-6">
              {client.policies.map((p, i) =>
                <li key={i}>{p.carrier}: {p.plan} (Eff. {p.effective})</li>
              )}
            </ul>
          )
          : <span>No other policies.</span>
        }
      </div>
      <div>
        <span className="font-bold">📎 Uploaded Files:</span>{" "}
        {client.uploads && client.uploads.length
          ? (
            <ul className="list-disc ml-6">
              {client.uploads.map((f, i) =>
                <li key={i}>{f.label}: {f.file} ({f.date})</li>
              )}
            </ul>
          )
          : <span>No uploads.</span>
        }
      </div>
    </div>
  </div>
);

export default ClientDetailCard;
