import React, { useEffect, useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Pill, 
  AlertTriangle, 
  CheckCircle, 
  ShieldCheck, 
  Users, 
  Sparkles, 
  ArrowRight, 
  FileCheck,
  User 
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function Dashboard({ setActiveTab, onRunScenario }) {
  const [stats, setStats] = useState({
    upcomingAppointments: 1,
    pendingLabBookings: 1,
    refillsReady: 1,
    tasksNeedingOwners: 0,
    actionsPendingReview: 0,
    totalEvents: 0,
  });
  const [family, setFamily] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sRes, fRes] = await Promise.all([
        fetch('/api/dashboard/stats').then(r => r.json()),
        fetch('/api/family').then(r => r.json())
      ]);
      if (sRes && !sRes.error) setStats(sRes);
      if (Array.isArray(fRes)) setFamily(fRes);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Upcoming Hospital Visits',
      value: stats.upcomingAppointments,
      desc: 'Cardiology follow-up scheduled',
      icon: Calendar,
      bg: 'bg-blue-50/60',
      border: 'border-blue-100',
      iconBg: 'bg-blue-100 text-blue-700',
    },
    {
      title: 'Pending Lab Bookings',
      value: stats.pendingLabBookings,
      desc: 'Lipid profile unconfirmed',
      icon: Clock,
      bg: 'bg-amber-50/60',
      border: 'border-amber-100',
      iconBg: 'bg-amber-100 text-amber-700',
    },
    {
      title: 'Pharmacy Refills Ready',
      value: stats.refillsReady,
      desc: 'Metformin 500mg at Walgreens',
      icon: Pill,
      bg: 'bg-emerald-50/60',
      border: 'border-emerald-100',
      iconBg: 'bg-emerald-100 text-emerald-700',
    },
    {
      title: 'Tasks Needing Owners',
      value: stats.tasksNeedingOwners,
      desc: 'Requires sibling assignment',
      icon: AlertTriangle,
      bg: 'bg-rose-50/60',
      border: 'border-rose-100',
      iconBg: 'bg-rose-100 text-rose-700',
    },
    {
      title: 'Actions Awaiting Approval',
      value: stats.actionsPendingReview,
      desc: 'Human caregiver review queue',
      icon: FileCheck,
      bg: 'bg-purple-50/60',
      border: 'border-purple-100',
      iconBg: 'bg-purple-100 text-purple-700',
    },
    {
      title: 'Verified Calendar Events',
      value: stats.totalEvents,
      desc: 'Independently verified over HTTP',
      icon: ShieldCheck,
      bg: 'bg-teal-50/60',
      border: 'border-teal-100',
      iconBg: 'bg-teal-100 text-teal-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Care Recipient Card */}
      <div className="card-clean p-6 sm:p-7 border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                ACTIVE CARE PROTOCOL
              </span>
              <span className="text-xs text-slate-500">Care Recipient: Ramesh (Father) • Age 74</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Family Caregiver Coordinator
            </h1>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
              An agentic healthcare coordination workflow with multi-sibling ownership, hospital/pharmacy/lab source verification, consent enforcement, and human-in-the-loop approvals.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveTab('coordinator')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Care Coordinator</span>
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs sm:text-sm border border-slate-200 transition-colors shadow-xs cursor-pointer"
            >
              <span>Run Test Cases</span>
              <ArrowRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* 6 Key Status Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className={`p-5 rounded-xl border ${c.border} ${c.bg} card-clean card-clean-hover`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{c.title}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{c.value}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{c.desc}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${c.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout: Family Permissions Matrix & Quick Scenario Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Family Member Ownership & Consent Matrix */}
        <div className="lg:col-span-8 card-clean p-6 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-900">Family Caregivers &amp; Consent Permissions</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">Permission Boundaries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400 bg-slate-50/50">
                  <th className="py-2.5 px-3 font-semibold">Member</th>
                  <th className="py-2.5 px-3 font-semibold">Care Role</th>
                  <th className="py-2.5 px-3 font-semibold">Clinical Details Consent</th>
                  <th className="py-2.5 px-3 font-semibold">Schedule Access</th>
                  <th className="py-2.5 px-3 font-semibold">Permission Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {family.length > 0 ? (
                  family.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-medium text-slate-900 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-200">
                          {m.name[0]}
                        </div>
                        {m.name}
                      </td>
                      <td className="py-3 px-3 text-slate-600">{m.role}</td>
                      <td className="py-3 px-3">
                        {m.consentMedicalDetails ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                            <ShieldCheck className="w-3.5 h-3.5" /> Full Medical Consent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            <AlertTriangle className="w-3.5 h-3.5" /> Redacted (TC2 Safeguard)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-700 font-medium">Authorized</span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-xs">{m.notes || 'Default policy'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-4 text-center text-slate-400">
                      Loading family records...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Launch & Testing Suite Card */}
        <div className="lg:col-span-4 card-clean p-6 border border-slate-200 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-900">Official Scenarios (P0)</h2>
          </div>
          <p className="text-xs text-slate-500">
            Click any official rubric scenario to execute the complete agentic pipeline:
          </p>
          <div className="space-y-2">
            {[
              { id: 'TC1', name: 'TC1: Verified Appointments', desc: 'All confirmed + 100% owned' },
              { id: 'TC2', name: 'TC2: Recipient Not Consented', desc: 'Strict clinical redaction' },
              { id: 'TC3', name: 'TC3: Task Without Owner', desc: 'Prompts for assignment' },
              { id: 'TC4', name: 'TC4: Lab Unconfirmed', desc: 'Tentative reminder tagged' },
            ].map((tc) => (
              <button
                key={tc.id}
                onClick={() => {
                  onRunScenario(tc.id);
                  setActiveTab('tests');
                }}
                className="w-full text-left p-3 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {tc.name}
                  </p>
                  <p className="text-[11px] text-slate-500">{tc.desc}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
