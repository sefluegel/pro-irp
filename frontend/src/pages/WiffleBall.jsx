// /frontend/src/pages/WiffleBall.jsx
import React, { useMemo, useState } from "react";
import {
  Trophy,
  Search,
  ChevronUp,
  ChevronDown,
  Users,
  Award,   // <- replaced Baseball with Award
  Target,
} from "lucide-react";

// --- mock season data (10 players) ---
const RAW_PLAYERS = [
  ["A. Martinez", 24, 78, 38, 7, 1, 12, 9, 41, 29, 6],
  ["B. Johnson", 22, 74, 31, 5, 2, 8, 12, 33, 27, 10],
  ["C. Lee", 25, 81, 26, 6, 1, 5, 20, 22, 19, 14],
  ["D. Patel", 23, 69, 35, 8, 0, 7, 5, 28, 23, 4],
  ["E. Nguyen", 21, 63, 24, 4, 1, 6, 11, 26, 18, 5],
  ["F. Brooks", 26, 88, 44, 10, 1, 9, 6, 36, 31, 8],
  ["G. Rivera", 19, 55, 19, 3, 0, 4, 9, 17, 14, 12],
  ["H. Kim", 20, 60, 28, 5, 1, 5, 7, 21, 20, 9],
  ["I. O’Neal", 18, 50, 17, 2, 0, 3, 6, 14, 12, 7],
  ["J. Thompson", 24, 76, 30, 6, 1, 7, 13, 29, 25, 11],
];

// --- helpers ---
function calcStats([name, GP, AB, H, _2B, _3B, HR, BB, RBI, R, SB]) {
  const singles = Math.max(0, H - _2B - _3B - HR);
  const TB = singles + 2 * _2B + 3 * _3B + 4 * HR;
  const AVG = AB ? H / AB : 0;
  const OBP = AB + BB ? (H + BB) / (AB + BB) : 0;
  const SLG = AB ? TB / AB : 0;
  const OPS = OBP + SLG;
  return { name, GP, AB, H, _2B, _3B, HR, BB, RBI, R, SB, AVG, OBP, SLG, OPS };
}
const PLAYERS = RAW_PLAYERS.map(calcStats);

function f3(n) {
  return n.toFixed(3);
}

// --- component ---
export default function WiffleBall() {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("OPS");
  const [sortDir, setSortDir] = useState("desc");
  const year = new Date().getFullYear();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? PLAYERS.filter((p) => p.name.toLowerCase().includes(q)) : PLAYERS.slice();
    const dir = sortDir === "asc" ? 1 : -1;
    return base.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [query, sortKey, sortDir]);

  const leaders = useMemo(() => {
    const minAB = 20;
    const pool = PLAYERS.filter((p) => p.AB >= minAB);
    const topAVG = pool.slice().sort((a, b) => b.AVG - a.AVG).slice(0, 3);
    const topHR = pool.slice().sort((a, b) => b.HR - a.HR).slice(0, 3);
    const topRBI = pool.slice().sort((a, b) => b.RBI - a.RBI).slice(0, 3);
    const topSB = pool.slice().sort((a, b) => b.SB - a.SB).slice(0, 3);
    return { topAVG, topHR, topRBI, topSB, minAB };
  }, []);

  function setSort(k) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  }

  const SortIcon = sortDir === "asc" ? ChevronUp : ChevronDown;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-amber-50 to-amber-100">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur">
        <div className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-[#FFB800]" />
            <h1 className="text-3xl font-black tracking-tight text-[#172A3A]">
              Wiffle Ball — Player Stats {year}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 bg-white border rounded-xl px-3 py-2">
              <Search size={16} className="text-gray-400" />
              <input
                className="outline-none text-sm"
                placeholder="Search player…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-8 grid grid-cols-1 2xl:grid-cols-5 gap-6">
        {/* Left: Leaders & Summary */}
        <div className="2xl:col-span-2 flex flex-col gap-6">
          {/* Summary cards */}
          <section className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <SummaryCard icon={<Users className="w-5 h-5" />} label="Players" value={PLAYERS.length} />
            <SummaryCard icon={<Award className="w-5 h-5" />} label="Total HR" value={PLAYERS.reduce((s, p) => s + p.HR, 0)} />
          </section>

          {/* Leaders */}
          <section className="bg-white rounded-3xl shadow p-6 border border-amber-100">
            <h3 className="text-xl font-bold text-[#172A3A] mb-4 flex items-center gap-2">
              <Trophy className="text-[#FFB800]" /> League Leaders
              <span className="ml-2 text-xs text-gray-500">(min {leaders.minAB} AB)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LeadersBlock title="AVG" rows={leaders.topAVG} fmt={(p) => f3(p.AVG)} />
              <LeadersBlock title="HR" rows={leaders.topHR} fmt={(p) => p.HR} />
              <LeadersBlock title="RBI" rows={leaders.topRBI} fmt={(p) => p.RBI} />
              <LeadersBlock title="SB" rows={leaders.topSB} fmt={(p) => p.SB} />
            </div>
          </section>

          {/* Fun callout */}
          <section className="bg-gradient-to-r from-[#172A3A] via-[#1F3B52] to-[#172A3A] text-white rounded-3xl p-6 shadow">
            <div className="flex items-center gap-3">
              <Target className="text-[#FFB800]" />
              <div>
                <div className="text-sm opacity-90">Season Highlight</div>
                <div className="text-xl font-extrabold">Chase the OPS Crown</div>
                <div className="text-white/80">
                  Sort by <b>OPS</b> to see who’s mashing. Click column headers to reorder.
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right: Table */}
        <div className="2xl:col-span-3">
          <section className="bg-white rounded-3xl shadow p-6 border border-amber-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold text-[#172A3A]">Player Table</h3>
              <div className="flex items-center gap-2 md:hidden">
                <Search size={16} className="text-gray-400" />
                <input
                  className="border rounded-lg px-2 py-1 text-sm"
                  placeholder="Search player…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    {[
                      ["name", "Player"],
                      ["GP", "GP"],
                      ["AB", "AB"],
                      ["H", "H"],
                      ["HR", "HR"],
                      ["RBI", "RBI"],
                      ["SB", "SB"],
                      ["AVG", "AVG"],
                      ["OBP", "OBP"],
                      ["SLG", "SLG"],
                      ["OPS", "OPS"],
                    ].map(([key, label]) => (
                      <th key={key} className="py-2 pr-4">
                        <button
                          onClick={() => setSort(key)}
                          className="flex items-center gap-1 hover:text-[#172A3A]"
                          title={`Sort by ${label}`}
                        >
                          {label}
                          {sortKey === key && <SortIcon size={14} className="inline" />}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.name} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-semibold text-gray-900">{p.name}</td>
                      <td className="py-2 pr-4">{p.GP}</td>
                      <td className="py-2 pr-4">{p.AB}</td>
                      <td className="py-2 pr-4">{p.H}</td>
                      <td className="py-2 pr-4">{p.HR}</td>
                      <td className="py-2 pr-4">{p.RBI}</td>
                      <td className="py-2 pr-4">{p.SB}</td>
                      <td className="py-2 pr-4">{f3(p.AVG)}</td>
                      <td className="py-2 pr-4">{f3(p.OBP)}</td>
                      <td className="py-2 pr-4">{f3(p.SLG)}</td>
                      <td className="py-2 pr-4 font-bold text-[#172A3A]">{f3(p.OPS)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td className="py-6 text-gray-500" colSpan={11}>
                        No players match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 border border-amber-100">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <div className="text-2xl font-extrabold text-[#172A3A]">{value}</div>
        <div className="text-[#FFB800]">{icon}</div>
      </div>
    </div>
  );
}

function LeadersBlock({ title, rows, fmt }) {
  return (
    <div className="bg-white rounded-2xl border border-amber-100 p-4">
      <div className="text-sm font-bold text-[#172A3A] mb-2">{title}</div>
      <ol className="space-y-1">
        {rows.map((p, i) => (
          <li key={p.name} className="flex items-center justify-between">
            <span className="text-gray-800">
              <span className="inline-block w-5 text-[#FFB800] font-bold">{i + 1}.</span> {p.name}
            </span>
            <span className="font-semibold">{fmt(p)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
