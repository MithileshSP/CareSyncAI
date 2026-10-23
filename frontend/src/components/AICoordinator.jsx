import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Shield, 
  Globe2, 
  CheckCircle2, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  FileCheck2,
  Calendar,
  Pill,
  TestTube
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function AICoordinator({ onPlanCreated, setActiveTab, browserbaseSession, setBrowserbaseSession }) {
  const [prompt, setPrompt] = useState(
    "My father has an appointment on Monday. Arrange a lab test before the appointment, assign Arun to collect the medication refill, and prepare a schedule for Priya."
  );
  const [consent, setConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [bbLoading, setBbLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);

  const samplePrompts = [
    {
      title: "Full Family Care Coordination",
      text: "Dad has appointment APT-101 on Monday. Arrange lab LAB-302 before it, assign Arun to collect refill RX-201, and backup to Priya."
    },
    {
      title: "Lab Test Coordination",
      text: "Schedule fasting blood test LAB-301 for dad, assign Karthik as owner and Priya as backup."
    },
    {
      title: "Pharmacy Refill Only",
      text: "Dad's Metformin refill RX-201 is ready at Walgreens. Assign Arun to pick it up with backup Priya."
    },
    {
      title: "Missing Owner Request (TC3)",
      text: "Refill prescription RX-201 and schedule appointment APT-101 for Arun."
    }
  ];

  const handlePlan = async (customPrompt) => {
    const textToRun = customPrompt || prompt;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToRun,
          consent: consent
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to generate care plan');
      }
      setLastResult(data);
      if (onPlanCreated) onPlanCreated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBrowserbaseSession = async () => {
    setBbLoading(true);
    try {
      const res = await fetch('/api/browserbase/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.id) {
        setBrowserbaseSession(data);
      } else {
        alert("Browserbase response: " + JSON.stringify(data));
      }
    } catch (err) {
      alert("Browserbase error: " + err.message);
    } finally {
      setBbLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-clean p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
              AGENTIC PIPELINE
            </span>
            <span className="text-xs text-slate-500">Deterministic Rule Enforcement</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            AI Care Coordinator
          </h1>
          <p className="text-sm text-slate-600">
            Converts natural-language care requests into verified, privacy-safe schedules backed by mock portal evidence.
          </p>
        </div>

        {/* Browserbase Trigger */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateBrowserbaseSession}
            disabled={bbLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            {bbLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe2 className="w-3.5 h-3.5 text-blue-600" />}
            <span>{browserbaseSession ? 'New Browserbase Session' : 'Launch Cloud Browser (BB)'}</span>
          </button>
        </div>
      </div>

      {/* Main Input Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 card-clean p-6 border border-slate-200 space-y-4">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Caregiver Request (Natural Language)
          </label>
          <div>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. My father has an appointment on Monday. Arrange a lab test before it, assign Arun to collect medication..."
              className="w-full rounded-lg bg-white border border-slate-300 p-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors shadow-2xs"
            />
          </div>

          {/* Privacy Consent Checkbox */}
          <div className="p-3.5 rounded-lg bg-blue-50/50 border border-blue-200/80 flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-white border-slate-300 cursor-pointer"
              />
              <div>
                <span className="text-xs sm:text-sm font-medium text-slate-900 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-blue-600" /> Recipient consented to share medical details
                </span>
                <p className="text-[11px] text-slate-500">
                  When unchecked, clinical diagnoses and medication titles are strictly redacted (TC2 test condition).
                </p>
              </div>
            </label>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              onClick={() => handlePlan()}
              disabled={loading || !prompt.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Querying Portals...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Generate Verified Care Plan</span>
                </>
              )}
            </button>

            {error && (
              <span className="text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {error}
              </span>
            )}
          </div>

          {/* Quick Examples */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase">Quick Test Prompts:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {samplePrompts.map((sp, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(sp.text);
                    handlePlan(sp.text);
                  }}
                  className="text-left p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs transition-colors cursor-pointer"
                >
                  <p className="font-semibold text-slate-800">{sp.title}</p>
                  <p className="text-[11px] text-slate-500 truncate">{sp.text}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time Agent Workflow Explainer */}
        <div className="lg:col-span-4 card-clean p-6 border border-slate-200 space-y-4">
          <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Controlled Agent Pipeline
          </h2>
          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">1</span>
              <div>
                <p className="font-semibold text-slate-900">Extract &amp; Structure</p>
                <p className="text-slate-500">Gemini / NLP identifies refs, owner, backup. Rejects invented IDs.</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex gap-2.5">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">2</span>
              <div>
                <p className="font-semibold text-slate-900">Query Mock Portals</p>
                <p className="text-slate-500">Queries Hospital, Pharmacy, Lab REST APIs. Records URL &amp; timestamps.</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">3</span>
              <div>
                <p className="font-semibold text-slate-900">Enforce Rules &amp; Privacy</p>
                <p className="text-slate-500">Requires 1 owner + 1 backup. Redacts medical details if consent is false.</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex gap-2.5">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">4</span>
              <div>
                <p className="font-semibold text-slate-900">Human-in-the-Loop</p>
                <p className="text-slate-500">Proposes actions to Approval Center. Execution waits for caregiver approval.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Care Plan Live Preview */}
      {lastResult && (
        <div className="card-clean p-6 border border-slate-200 space-y-5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-900">Generated Plan: {lastResult.id}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-medium border border-blue-200">
                  {lastResult.scenario}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Recipient Consented: <b className="text-slate-800">{String(lastResult.recipientConsented)}</b> • Status: <b className="text-amber-700">{lastResult.approval.toUpperCase()}</b>
              </p>
            </div>
            <button
              onClick={() => setActiveTab('approvals')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors shadow-xs cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Review in Approval Center ({lastResult.actions?.length || 0})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-3 font-semibold">Task ID</th>
                  <th className="py-2.5 px-3 font-semibold">Mock Portal Evidence</th>
                  <th className="py-2.5 px-3 font-semibold">Owner</th>
                  <th className="py-2.5 px-3 font-semibold">Backup</th>
                  <th className="py-2.5 px-3 font-semibold">Booking Status</th>
                  <th className="py-2.5 px-3 font-semibold">Ownership Status</th>
                  <th className="py-2.5 px-3 font-semibold">Coordinator Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lastResult.items?.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {it.task.id} <span className="text-xs text-blue-600 font-mono">({it.task.ref})</span>
                    </td>
                    <td className="py-3 px-3">
                      {it.evidence.record ? (
                        <div>
                          <p className="font-medium text-slate-900">{it.evidence.record.title}</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">{it.evidence.url}</p>
                          <p className="text-[10px] text-slate-500">Retrieved: {it.evidence.retrievedAt}</p>
                        </div>
                      ) : (
                        <span className="text-rose-600 text-xs">Lookup Failed</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900">{it.task.owner || '—'}</td>
                    <td className="py-3 px-3 text-slate-500">{it.task.backup || '—'}</td>
                    <td className="py-3 px-3">
                      <StatusBadge type="booking" value={it.booking} />
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge type="ownership" value={it.ownership} />
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600">{it.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Audit Logs */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800 mb-1">Workflow Audit Trail:</p>
            {lastResult.log?.map((l, i) => (
              <p key={i} className="text-slate-500">
                {l}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
