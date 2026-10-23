import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ShieldAlert, 
  ShieldCheck,
  RefreshCw, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react';

export default function SharedCalendar({ currentUser }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scopeFilter, setScopeFilter] = useState('all'); // all | my
  const [typeFilter, setTypeFilter] = useState('all');   // all | confirmed | pending

  useEffect(() => {
    fetchCalendar();
  }, []);

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/calendar');
      const data = await res.json();
      if (Array.isArray(data)) {
        setEvents(data);
      }
    } catch (err) {
      console.error("Calendar fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const hasMedicalConsent = currentUser ? currentUser.consentMedicalDetails : true;

  const filteredEvents = events.filter((e) => {
    // 1. My assigned tasks vs all
    if (scopeFilter === 'my') {
      const isMyTask = (e.owner || '').toLowerCase().includes((currentUser?.name || '').toLowerCase());
      if (!isMyTask) return false;
    }
    // 2. Confirmed vs pending
    if (typeFilter === 'confirmed') return !e.tentative;
    if (typeFilter === 'pending') return e.tentative;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-clean p-6 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              EXECUTED SCHEDULE
            </span>
            <span className="text-xs text-slate-500">Logged in as: <b className="text-slate-800">{currentUser?.name || 'Arun'}</b> ({currentUser?.role || 'Caregiver'})</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-emerald-600" />
            Shared Family Calendar
          </h1>
          <p className="text-sm text-slate-600">
            Approved events and tentative reminders. Dynamically enforces privacy masking according to each family member's clinical consent.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Member Perspective Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium shadow-2xs bg-white">
            {hasMedicalConsent ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-emerald-600" /> Full Clinical View
              </span>
            ) : (
              <span className="text-amber-700 flex items-center gap-1 font-semibold">
                <EyeOff className="w-3.5 h-3.5 text-amber-600" /> Medical Redacted (TC2)
              </span>
            )}
          </div>

          <button
            onClick={fetchCalendar}
            disabled={loading}
            className="p-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 cursor-pointer shadow-2xs"
            title="Refresh Calendar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
        {/* Scope: All vs My Tasks */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-500 mr-1 font-medium">View Scope:</span>
          <div className="p-0.5 bg-slate-100 rounded-lg flex border border-slate-200">
            <button
              onClick={() => setScopeFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                scopeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Family Events ({events.length})
            </button>
            <button
              onClick={() => setScopeFilter('my')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                scopeFilter === 'my' ? 'bg-white text-blue-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Assigned to {currentUser?.name || 'Me'}
            </button>
          </div>
        </div>

        {/* State: Confirmed vs Tentative */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-500 mr-1 font-medium">Status:</span>
          <div className="p-0.5 bg-slate-100 rounded-lg flex border border-slate-200">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                typeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter('confirmed')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                typeFilter === 'confirmed' ? 'bg-white text-emerald-700 shadow-2xs font-semibold' : 'text-slate-600'
              }`}
            >
              Confirmed
            </button>
            <button
              onClick={() => setTypeFilter('pending')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                typeFilter === 'pending' ? 'bg-white text-amber-700 shadow-2xs font-semibold' : 'text-slate-600'
              }`}
            >
              Tentative [PENDING]
            </button>
          </div>
        </div>
      </div>

      {/* Events Grid / Timeline */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((evt) => {
            const isTentative = evt.tentative || evt.title.includes('[PENDING]');
            const isMyTask = (evt.owner || '').toLowerCase().includes((currentUser?.name || '').toLowerCase());
            
            // Contextual privacy enforcement:
            // If logged-in user does NOT have consent to view clinical details, redact event title & details
            const isPermanentlyRestricted = evt.title.includes('restricted') || evt.details?.includes('restricted');
            const shouldRedactForUser = !hasMedicalConsent || isPermanentlyRestricted;

            const displayTitle = shouldRedactForUser 
              ? (isTentative ? "Care task reminder [PENDING] (details restricted)" : "Care task (details restricted)")
              : evt.title;

            const displayDetails = shouldRedactForUser
              ? "Clinical details redacted under patient privacy consent rules (TC2 constraint)."
              : evt.details;

            return (
              <div
                key={evt.id}
                className={`p-5 rounded-xl border card-clean card-clean-hover flex flex-col justify-between transition-all ${
                  isMyTask 
                    ? 'ring-1 ring-blue-500/30 bg-blue-50/20' 
                    : isTentative
                    ? 'border-amber-200 bg-amber-50/20'
                    : shouldRedactForUser
                    ? 'border-purple-200 bg-purple-50/20'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="font-mono text-xs font-semibold text-slate-700 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                      {evt.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isMyTask && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white shadow-2xs">
                          YOUR TASK
                        </span>
                      )}
                      {isTentative ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          <Clock className="w-3 h-3" /> TENTATIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" /> CONFIRMED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Privacy Warning */}
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-start gap-1.5">
                    {shouldRedactForUser && (
                      <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" title="Redacted for this viewer" />
                    )}
                    <span>{displayTitle}</span>
                  </h3>

                  {/* Details */}
                  {displayDetails && (
                    <p className={`text-xs mt-2 p-2.5 rounded border ${
                      shouldRedactForUser ? 'bg-purple-50/50 text-purple-800 border-purple-100 italic' : 'bg-slate-50 text-slate-600 border-slate-100'
                    }`}>
                      {displayDetails}
                    </p>
                  )}
                </div>

                {/* Footer Metadata with Family Member Ownership */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>{evt.start || 'Time TBD'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Owner: <b>{evt.owner || 'Family'}</b></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card-clean p-12 border border-slate-200 text-center space-y-3">
          <CalendarIcon className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No Events Found For This View</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {scopeFilter === 'my' 
              ? `No events are currently assigned to ${currentUser?.name || 'this member'}.`
              : 'Events are scheduled only after human review and authorization in the Approval Center.'}
          </p>
          {scopeFilter === 'my' && (
            <button
              onClick={() => setScopeFilter('all')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer"
            >
              View All Family Events
            </button>
          )}
        </div>
      )}
    </div>
  );
}
