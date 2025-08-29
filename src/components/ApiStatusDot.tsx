import React from "react";
import { useApiHealth } from "../hooks/useApiHealth";

export default function ApiStatusDot({ label = true }: { label?: boolean }) {
  const status = useApiHealth();
  const color = status === "green" ? "#22c55e" : status === "amber" ? "#eab308" : "#ef4444";
  const text  = status === "green" ? "API OK"   : status === "amber" ? "API Degraded" : "API Down";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "6px",
      fontSize: 12, padding: "6px 10px", borderRadius: 9999,
      background: "rgba(0,0,0,0.6)", color: "#fff",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
    }}>
      <span style={{display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: color}} />
      {label && <span>{text}</span>}
    </div>
  );
}
