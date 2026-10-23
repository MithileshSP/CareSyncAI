import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ExternalLink, 
  RefreshCw, 
  Calendar, 
  Pill, 
  TestTube, 
  Edit3 
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function MockPortals() {
  const [records, setRecords] = useState([]);
  const [activeKind, setActiveKind] = useState('all');
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchPortals();
  }, []);

  const fetchPortals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/portals');
      const data = await res.json();
      if (Array.isArray(data)) setRecords(data);
    } catch (err) {
      console.error("Portals fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    setUpdatingId(id);
    let nextStatus = 'confirmed';
    if (currentStatus === 'confirmed') nextStatus = 'requested';
    else if (currentStatus === 'requested') nextStatus = 'ready';
    else if (currentStatus === 'ready') nextStatus = 'confirmed';

    try {
      const res = await fetch(`/api/portals/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        await fetchPortals();
      }
    } catch (err) {
      alert("Failed updating status: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredRecords = records.filter(r => activeKind === 'all' || r.kind === activeKind);

  const getKindBadge = (kind) => {
    if (kind === 'hospital') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <Calendar className="w-3.5 h-3.5" /> Hospital Portal
        </span>
      );
    }
    if (kind === 'pharmacy') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Pill className="w-3.5 h-3.5" /> Pharmacy Portal
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <TestTube className="w-3.5 h-3.5" /> Laboratory Portal
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-clean p-6 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
              SYNTHETIC GROUND TRUTH
            </span>
            <span className="text-xs text-slate-500">Stable IDs &amp; REST / HTML Endpoints</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600" />
            Mock Healthcare Portals
          </h1>
          <p className="text-sm text-slate-600">
            Three independent simulated clinical systems. Exposes both REST APIs for direct retrieval and HTML tables for Browserbase automation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPortals}
            disabled={loading}
            className="p-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 cursor-pointer shadow-2xs"
            title="Refresh portal records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200 text-xs">
          {['all', 'hospital', 'pharmacy', 'lab'].map((k) => (
            <button
              key={k}
              onClick={() => setActiveKind(k)}
              className={`px-3 py-1.5 rounded font-medium capitalize transition-colors cursor-pointer ${
                activeKind === k ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {k === 'all' ? 'All Portals' : `${k} Portal`}
            </button>
          ))}
        </div>

        {/* HTML Scrape Links for Browserbase Testing */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 hidden sm:inline">Raw HTML (Browserbase):</span>
          {['hospital', 'pharmacy', 'lab'].map((kind) => (
            <a
              key={kind}
              href={`/portal/${kind}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-mono text-[11px] shadow-2xs transition-colors"
            >
              <span>/{kind}</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          ))}
        </div>
      </div>

      {/* Portals Records Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRecords.map((r) => (
          <div
            key={r.id}
            className="p-5 rounded-xl border border-slate-200 bg-white card-clean card-clean-hover space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-xs font-semibold text-slate-800 border border-slate-200">
                    {r.id}
                  </span>
                  {getKindBadge(r.kind)}
                </div>
                <h3 className="text-sm font-bold text-slate-900">{r.title}</h3>
              </div>
              <StatusBadge type="booking" value={r.status} />
            </div>

            <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <p><span className="text-slate-400">Provider:</span> <b className="text-slate-800">{r.providerName || 'Simulated Provider'}</b></p>
              <p><span className="text-slate-400">Facility:</span> <b className="text-slate-800">{r.location || 'Metro Clinic'}</b></p>
              <p><span className="text-slate-400">Scheduled Date:</span> <b className="text-slate-800 font-mono">{r.date}</b></p>
            </div>

            {/* Interactive Status Switcher */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
              <a
                href={`/portal/lookup/${r.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-mono text-[11px]"
              >
                <span>GET /portal/lookup/{r.id}</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                onClick={() => handleToggleStatus(r.id, r.status)}
                disabled={updatingId === r.id}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer transition-colors"
                title="Toggle status to test how agent dynamically detects changes"
              >
                <Edit3 className="w-3 h-3 text-amber-600" />
                <span>{updatingId === r.id ? 'Updating...' : `Toggle Status`}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
