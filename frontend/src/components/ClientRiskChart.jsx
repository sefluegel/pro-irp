// /frontend/src/components/ClientRiskChart.jsx
import React from "react";

// You can tweak these to match your brand palette!
const RISK_MAP = [
  {
    label: "Extremely High Risk",
    color: "#dc2626", // red-600
    textColor: "#dc2626",
    min: 86,
    max: 100
  },
  {
    label: "High Risk",
    color: "#f59e42", // orange-400
    textColor: "#f59e42",
    min: 76,
    max: 85
  },
  {
    label: "Moderately High",
    color: "#fbbf24", // yellow-400
    textColor: "#b45309", // darker gold
    min: 51,
    max: 75
  },
  {
    label: "Moderate",
    color: "#38bdf8", // sky-400 / tealish
    textColor: "#0e7490",
    min: 26,
    max: 50
  },
  {
    label: "Low Risk",
    color: "#22c55e", // green-500
    textColor: "#15803d",
    min: 0,
    max: 25
  }
];

// Get risk tier based on score
function getRisk(score) {
  return RISK_MAP.find(tier => score >= tier.min && score <= tier.max) || RISK_MAP[RISK_MAP.length - 1];
}

const ClientRiskChart = ({ score, size = 80 }) => {
  const tier = getRisk(score);

  // Donut chart
  const percent = Math.min(score, 100) / 100;
  const radius = size / 2 - 7;
  const stroke = 8;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - percent);

  return (
    <div className="flex items-center gap-4">
      {/* Donut Chart */}
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tier.color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
        <text
          x="50%"
          y="53%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontWeight="bold"
          fontSize={size * 0.36}
          fill="#172A3A"
        >
          {score}
        </text>
      </svg>
      {/* Risk label on right */}
      <div>
        <div className="font-bold" style={{ color: tier.textColor, fontSize: size * 0.19 }}>
          {tier.label}
        </div>
        <div className="text-[#536179] text-sm font-medium mt-1" style={{ fontSize: size * 0.13 }}>
          (Score: {score})
        </div>
      </div>
    </div>
  );
};

export default ClientRiskChart;
