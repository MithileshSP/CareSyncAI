import React from 'react';
import { CheckCircle2, Clock, AlertCircle, UserCheck, UserX, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function StatusBadge({ type, value }) {
  if (!value) return <span className="text-slate-400 text-xs">—</span>;

  const val = String(value).toLowerCase();

  if (type === 'booking') {
    if (val === 'confirmed' || val === 'ready') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium badge-confirmed">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          {val.toUpperCase()}
        </span>
      );
    }
    if (val === 'pending' || val === 'requested') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium badge-pending">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          PENDING
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium badge-unknown">
        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
        {val.toUpperCase()}
      </span>
    );
  }

  if (type === 'ownership') {
    if (val === 'assigned') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium badge-assigned">
          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
          ASSIGNED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium badge-requested">
        <UserX className="w-3.5 h-3.5 text-purple-600" />
        {val.replace('_', ' ').toUpperCase()}
      </span>
    );
  }

  if (type === 'approval') {
    if (val === 'approved') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium badge-confirmed">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          APPROVED
        </span>
      );
    }
    if (val === 'rejected') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium badge-unknown">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          REJECTED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium badge-pending">
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        PENDING REVIEW
      </span>
    );
  }

  if (type === 'verification') {
    if (val === 'verified') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium badge-confirmed">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          VERIFIED
        </span>
      );
    }
    if (val === 'failed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium badge-unknown">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          VERIFY FAILED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        NOT RUN
      </span>
    );
  }

  if (type === 'pass') {
    return value ? (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> PASS
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> FAIL
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
      {val}
    </span>
  );
}
