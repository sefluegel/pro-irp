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

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width={120} height={120} className="mb-[-80px] z-0">
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
      <div className="relative -mt-16 z-10 flex flex-col items-center">
        <span className="text-xl font-bold" style={{ color: getColor(score) }}>
          {score >= 85 ? "Low Risk" : score >= 60 ? "Caution" : "Danger"}
        </span>
        <span className="text-sm text-gray-400">Risk Score</span>
      </div>
    </div>
  );
};

export default ClientRiskChart;
