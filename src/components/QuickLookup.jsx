import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Search, User, AlertTriangle, Loader2 } from "lucide-react";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";

const QuickLookup = () => {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced search
  const searchClients = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE}/clients?search=${encodeURIComponent(query)}&limit=8`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.data || []);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Quick lookup error:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      searchClients(q);
    }, 300);

    return () => clearTimeout(timer);
  }, [q, searchClients]);

  // Get risk color
  const getRiskColor = (score) => {
    if (score >= 80) return "text-red-600 bg-red-50";
    if (score >= 65) return "text-orange-600 bg-orange-50";
    if (score >= 50) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 border-t-4" style={{ borderTopColor: "#007cf0" }}>
      <div className="text-lg font-semibold text-[#172A3A] mb-3 flex items-center gap-2">
        <Search size={20} className="text-blue-500" />
        {t('quickClientLookup')}
      </div>

      <div className="relative">
        <input
          className="w-full p-2 pl-9 mb-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          type="text"
          placeholder={t('searchByName')}
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
        {loading && (
          <Loader2 size={16} className="absolute right-3 top-3 text-blue-500 animate-spin" />
        )}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {!hasSearched && !q && (
          <div className="text-sm text-gray-400 text-center py-4">
            Type at least 2 characters to search
          </div>
        )}

        {hasSearched && !loading && results.length === 0 && (
          <div className="text-sm text-gray-400 text-center py-4">
            {t('noClientsFound')}
          </div>
        )}

        {results.map(client => (
          <Link
            key={client.id}
            to={`/clients/${client.id}`}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User size={16} className="text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-[#172A3A] group-hover:text-blue-600">
                  {client.first_name} {client.last_name}
                </div>
                {client.carrier && (
                  <div className="text-xs text-gray-500">{client.carrier}</div>
                )}
              </div>
            </div>

            {client.risk_score !== undefined && client.risk_score !== null && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getRiskColor(client.risk_score)}`}>
                {client.risk_score >= 65 && <AlertTriangle size={12} />}
                {client.risk_score}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default QuickLookup;
