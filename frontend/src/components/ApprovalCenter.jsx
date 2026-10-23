import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Check, 
  X, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  Calendar, 
  User, 
  Loader2, 
  RefreshCw
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function ApprovalCenter({ currentRun, onActionCompleted, setActiveTab }) {
  const [run, setRun] = useState(currentRun);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (currentRun) {
      setRun(currentRun);
    } else {
      fetchLatestPendingRun();
    }
  }, [currentRun]);

  const fetchLatestPendingRun = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/runs');
      const runs = await res.json();
      if (Array.isArray(runs) && runs.length > 0) {
        const pending = runs.filter(r => r.approval === 'pending');
        setRun(pending.length > 0 ? pending[pending.length - 1] : runs[runs.length - 1]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!run) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/runs/${run.id}/approve`, { method: 'POST' });
      const updated = await res.json();
      setRun(updated);
      if (onActionCompleted) onActionCompleted(updated);
    } catch (err) {
      alert("Approve error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!run) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/runs/${run.id}/reject`, { method: 'POST' });
      const updated = await res.json();
      setRun(updated);
      if (onActionCompleted) onActionCompleted(updated);
    } catch (err) {
      alert("Reject error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-clean p-6 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              HUMAN-IN-THE-LOOP CONTROL
            </span>
            <span className="text-xs text-slate-500">Step 7 &amp; 8 of Agentic Workflow</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-600" />
            Caregiver Approval Center
          </h1>
          <p className="text-sm text-slate-600">
            The AI proposes calendar actions; the caregiver retains sole authority to authorize, reject, or modify execution.
          </p>
        </div>

        <button
          onClick={fetchLatestPendingRun}
          disabled={loading}
          className="p-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 cursor-pointer shadow-2xs"
          title="Refresh pending approvals"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {run ? (
        <div className="space-y-6">
          {/* Status Banner */}
          <div className="card-clean p-6 border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                  {run.id}
                </span>
                <span className="text-sm font-semibold text-slate-900">Scenario: {run.scenario}</span>
                <StatusBadge type="approval" value={run.approval} />
                <StatusBadge type="verification" value={run.verification} />
              </div>
              <p className="text-xs text-slate-600">
                Expected: <b className="text-slate-800">{run.expected}</b> • Actual: <b className="text-slate-700">{run.actual || 'Pending authorization'}</b>
              </p>
              <div className="flex items-center gap-2 text-xs">
                {run.recipientConsented ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" /> Recipient Consented (Full Details)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                    <ShieldAlert className="w-3.5 h-3.5" /> Recipient Not Consented (Medical Details Redacted)
                  </span>
                )}
              </div>
            </div>

            {/* Approval Decision Buttons */}
            {run.approval === 'pending' ? (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reject Proposal</span>
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Approve &amp; Execute</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
                  Decision finalized: <b className="text-slate-900 uppercase">{run.approval}</b>
                </div>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer shadow-xs"
                >
                  View in Shared Calendar
                </button>
              </div>
            )}
          </div>

          {/* Proposed Actions List */}
          <div className="card-clean p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Proposed Calendar Actions ({run.actions?.length || 0})</h2>
              <span className="text-xs text-slate-500">Idempotency Guarded</span>
            </div>

            {run.actions && run.actions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {run.actions.map((act, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[11px] font-mono text-blue-700 font-semibold px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                          {act.taskId} • Key: {act.key}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1.5">{act.title}</h4>
                      </div>
                      {act.tentative ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          <Clock className="w-3 h-3" /> Tentative Reminder
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          <Check className="w-3 h-3" /> Confirmed Event
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 bg-white p-2.5 rounded border border-slate-200">
                      {act.details || 'No clinical details (redacted under TC2 privacy constraint)'}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>{act.start}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-700 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>Assigned: {act.owner}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No calendar actions proposed for this plan.
              </div>
            )}
          </div>

          {/* Audit Trail */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs font-mono">
            <p className="font-semibold text-slate-700">Audit &amp; Verification Trail:</p>
            {run.log?.map((l, i) => (
              <p key={i} className="text-slate-500">
                {l}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <div className="card-clean p-12 border border-slate-200 text-center space-y-3">
          <CheckSquare className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No Approval Requests Pending</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Run an AI Coordination query or select a test scenario to inspect and approve actions.
          </p>
        </div>
      )}
    </div>
  );
}
