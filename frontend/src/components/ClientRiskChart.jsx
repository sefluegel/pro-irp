// /frontend/src/components/ClientRiskChart.jsx
import React from "react";

// Pie chart as SVG. Red: <60, Yellow: 60-84, Green: 85+
const getColor = score =>
  score >= 85 ? "#34D399" : score >= 60 ? "#FBBF24" : "#EF4444";

const ClientRiskChart = ({ score }) => {
  const percent = Math.min(Math.max(score, 0), 100);
  const radius = 48;
  const stroke = 14;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (percent / 100) * circ;

  // Decide status label
  const status =
    score >= 85 ? "Low Risk" :
    score >= 60 ? "Caution" :
    "Danger";

  return (
    <div className="flex flex-col items-center">
      {/* Status label above the chart */}
      <span
        className="text-lg font-bold mb-2"
        style={{ color: getColor(score), lineHeight: 1 }}
      >
        {status}
      </span>

      {/* Donut SVG */}
      <svg width={120} height={120}>
        <circle
          cx={60}
          cy={60}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={60}
          cy={60}
          r={radius}
          stroke={getColor(score)}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s" }}
        />
        <text
          x={60}
          y={65}
          textAnchor="middle"
          fontSize="2.3rem"
          fontWeight="bold"
          fill="#172A3A"
        >
          {score}
        </text>
      </svg>
    </div>
  );
};

export default ClientRiskChart;
