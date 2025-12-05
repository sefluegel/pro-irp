// src/pages/ExportClients.jsx
import React, { useEffect } from "react";
import { getExportCsvUrl } from "../api";

export default function ExportClients() {
  useEffect(() => {
    // kick off download
    window.location.href = getExportCsvUrl();
  }, []);
  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold">Exporting…</h1>
      <p className="text-sm text-slate-600">Your CSV download should start automatically.</p>
    </div>
  );
}
