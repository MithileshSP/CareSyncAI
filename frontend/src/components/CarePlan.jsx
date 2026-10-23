import React, { useState, useEffect } from 'react';
import { ListTodo, RefreshCw, Calendar, Pill, TestTube, CheckCircle2, Clock, AlertTriangle, ArrowRight, UserCheck } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function CarePlan({ currentRun, setActiveTab, currentUser }) {
  const [activePlan, setActivePlan] = useState(currentRun);
  const [loading, setLoading] = useState(false);
  const [scopeFilter, setScopeFilter] = useState('all'); // all | my

  useEffect(() => {
    if (currentRun) {
      setActivePlan(currentRun);
    } else {
      fetchLatestPlan();
    }
  }, [currentRun]);

  const fetchLatestPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/runs');
      const runs = await res.json();
      if (Array.isArray(runs) && runs.length > 0) {
        setActivePlan(runs[runs.length - 1]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getKindIcon = (ref) => {
    if (ref.startsWith('APT')) return <Calendar className="w-4 h-4 text-blue-600" />;
    if (ref.startsWith('RX')) return <Pill className="w-4 h-4 text-emerald-600" />;
    return <TestTube className="w-4 h-4 text-amber-600" />;
  };

  const filteredItems = (activePlan?.items || []).filter((it) => {
    if (scopeFilter === 'my') {
      const isOwner = (it.task.owner || '').toLowerCase() === (currentUser?.name || '').toLowerCase();
      const isBackup = (it.task.backup || '').toLowerCase() === (currentUser?.name || '').toLowerCase();
      return isOwner || isBackup;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-clean p-6 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              WEEKLY SCHEDULE
            </span>
            <span className="text-xs text-slate-500">Logged in: <b className="text-slate-800">{currentUser?.name || 'Arun'}</b> ({currentUser?.role || 'Caregiver'})</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-blue-600" />
            Weekly Care Plan
          </h1>
          <p className="text-sm text-slate-600">
            Every task is bound to one assigned owner, one backup, and ground-truth mock portal booking status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchLatestPlan}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Refresh Plan</span>
          </button>
          <button
            onClick={() => setActiveTab('coordinator')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
          >
            <span>Coordinate New Request</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {activePlan ? (
        <div className="space-y-6">
          {/* Plan Meta Header & Member Task Filter */}
          <div className="card-clean p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs font-bold">
                {activePlan.id}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">Scenario: {activePlan.scenario}</p>
                <p className="text-[11px] text-slate-500">
                  Target: <span className="text-slate-700">{activePlan.expected}</span>
                </p>
              </div>
            </div>

            {/* Scope Filter Buttons */}
            <div className="p-0.5 bg-slate-100 rounded-lg flex border border-slate-200 text-xs">
              <button
                onClick={() => setScopeFilter('all')}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  scopeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                All Family Tasks ({activePlan.items?.length || 0})
              </button>
              <button
                onClick={() => setScopeFilter('my')}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  scopeFilter === 'my' ? 'bg-white text-blue-700 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                My Responsibilities ({
                  activePlan.items?.filter(i => 
                    (i.task.owner||'').toLowerCase() === (currentUser?.name||'').toLowerCase() ||
                    (i.task.backup||'').toLowerCase() === (currentUser?.name||'').toLowerCase()
                  ).length || 0
                })
              </button>
            </div>
          </div>

          {/* Structured Tasks Table */}
          <div className="card-clean border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Care Schedule &amp; Allocations</h2>
              <span className="text-xs text-slate-500">{filteredItems.length} tasks shown</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 bg-slate-50/80">
                    <th className="py-2.5 px-4 font-semibold">Task Details</th>
                    <th className="py-2.5 px-4 font-semibold">Scheduled Date</th>
                    <th className="py-2.5 px-4 font-semibold">Primary Owner</th>
                    <th className="py-2.5 px-4 font-semibold">Backup</th>
                    <th className="py-2.5 px-4 font-semibold">Booking Status</th>
                    <th className="py-2.5 px-4 font-semibold">Ownership Status</th>
                    <th className="py-2.5 px-4 font-semibold">Evidence Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((it, idx) => {
                    const rec = it.evidence?.record;
                    const isMyOwner = (it.task.owner || '').toLowerCase() === (currentUser?.name || '').toLowerCase();
                    const isMyBackup = (it.task.backup || '').toLowerCase() === (currentUser?.name || '').toLowerCase();

                    return (
                      <tr key={idx} className={`hover:bg-slate-50/60 transition-colors ${isMyOwner ? 'bg-blue-50/20' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-start gap-2.5">
                            <div className="p-1.5 rounded bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                              {getKindIcon(it.task.ref)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-slate-900">
                                  {rec ? rec.title : it.task.ref}
                                </p>
                                {isMyOwner && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-600 text-white">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-blue-600">
                                {it.task.id} • {it.task.ref}
                              </span>
                              {it.note && (
                                <p className="text-[11px] text-slate-500 mt-0.5">{it.note}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {rec?.date || '—'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {it.task.owner ? (
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${
                              isMyOwner ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold' : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              {it.task.owner} {isMyOwner && '(You)'}
                            </span>
                          ) : (
                            <span className="text-rose-600 font-medium text-xs">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {it.task.backup ? (
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${
                              isMyBackup ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold' : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                              {it.task.backup} {isMyBackup && '(You)'}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge type="booking" value={it.booking} />
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge type="ownership" value={it.ownership} />
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-500">
                          {it.evidence?.url ? (
                            <div>
                              <span className="text-slate-700 font-medium">{rec?.kind?.toUpperCase()} PORTAL</span>
                              <p className="text-[10px] text-slate-400">{it.evidence.retrievedAt.split('T')[1]?.slice(0, 8)} UTC</p>
                            </div>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="card-clean p-12 border border-slate-200 text-center space-y-3">
          <ListTodo className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No Care Plan Available Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Use the AI Care Coordinator or run an official test case to generate a weekly care plan with validated portal bookings.
          </p>
          <button
            onClick={() => setActiveTab('coordinator')}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer shadow-xs"
          >
            Launch Coordinator
          </button>
        </div>
      )}
    </div>
  );
}
