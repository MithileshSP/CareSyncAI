import React, { useState } from 'react';
import { 
  HeartHandshake, 
  LayoutDashboard, 
  Bot, 
  ListTodo, 
  Calendar, 
  Building2, 
  CheckSquare, 
  FlaskConical, 
  Globe2,
  ExternalLink,
  Loader2,
  User,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
  Check
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, browserbaseSession, currentUser, setCurrentUser, familyList }) {
  const [bbLoading, setBbLoading] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'coordinator', label: 'AI Coordinator', icon: Bot },
    { id: 'careplan', label: 'Care Plan', icon: ListTodo },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'portals', label: 'Mock Portals', icon: Building2 },
    { id: 'approvals', label: 'Approvals', icon: CheckSquare },
    { id: 'tests', label: 'Test Suite', icon: FlaskConical },
  ];

  const defaultFamily = [
    { name: 'Arun', role: 'Primary Caregiver', consentMedicalDetails: true },
    { name: 'Priya', role: 'Backup Caregiver & Sibling', consentMedicalDetails: true },
    { name: 'Karthik', role: 'Sibling (Schedule Only)', consentMedicalDetails: false },
    { name: 'Ramesh (Father)', role: 'Care Recipient', consentMedicalDetails: true },
  ];

  const members = (familyList && familyList.length > 0) ? familyList : defaultFamily;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Left: Brand Identity */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer shrink-0 select-none group" 
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-xs group-hover:bg-blue-700 transition-colors">
              <HeartHandshake className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-slate-900 tracking-tight">CareSync</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 tracking-wider uppercase">
                AI
              </span>
            </div>
          </div>

          {/* Center: Segmented Navigation Bar */}
          <nav className="hidden lg:flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/70 shadow-2xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: User Switcher & Status Badges */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Active Logged-in Family Member Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer text-xs"
                title="Switch logged-in family member"
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${
                  currentUser?.name === 'Arun' ? 'bg-blue-600' :
                  currentUser?.name === 'Priya' ? 'bg-purple-600' :
                  currentUser?.name === 'Karthik' ? 'bg-amber-600' : 'bg-teal-600'
                }`}>
                  {currentUser?.name?.[0] || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-slate-900 leading-tight">{currentUser?.name || 'Arun'}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                  <span className="text-[10px] text-slate-500 leading-none">
                    {currentUser?.consentMedicalDetails ? 'Full Medical' : 'Restricted (TC2)'}
                  </span>
                </div>
              </button>

              {/* Dropdown Menu */}
              {userMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setUserMenuOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white border border-slate-200 shadow-lg p-2 z-50 animate-fadeIn text-xs">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="font-semibold text-slate-900 text-xs">Simulate Family Member Login</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Tests role-based task ownership and privacy masking across calendar &amp; care plan views.
                      </p>
                    </div>
                    <div className="py-1 space-y-1">
                      {members.map((m) => {
                        const isSelected = (currentUser?.name || 'Arun') === m.name;
                        return (
                          <button
                            key={m.name}
                            onClick={() => {
                              setCurrentUser(m);
                              setUserMenuOpen(false);
                            }}
                            className={`w-full text-left p-2.5 rounded-lg flex items-start justify-between transition-colors cursor-pointer ${
                              isSelected ? 'bg-blue-50/70 text-blue-950 font-medium' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-900">{m.name}</span>
                                {m.consentMedicalDetails ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    <ShieldCheck className="w-2.5 h-2.5" /> Full Consent
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-semibold">
                                    <ShieldAlert className="w-2.5 h-2.5" /> Redacted (TC2)
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">{m.role}</p>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-blue-600 mt-1 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Browserbase Live Status Badge */}
            {browserbaseSession ? (
              <a
                href={browserbaseSession.replayUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-2xs"
                title="View active Browserbase session recording"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-mono text-[11px]">BB Active</span>
                <ExternalLink className="w-3 h-3 text-emerald-600" />
              </a>
            ) : (
              <button
                onClick={async () => {
                  setBbLoading(true);
                  try {
                    const r = await fetch('/api/browserbase/session', { method: 'POST' }).then(res => res.json());
                    if (r.replayUrl) window.open(r.replayUrl, '_blank');
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setBbLoading(false);
                  }
                }}
                disabled={bbLoading}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                title="Launch a real Browserbase Cloud Browser session"
              >
                {bbLoading ? <Loader2 className="w-3 h-3 animate-spin text-blue-600" /> : <Globe2 className="w-3 h-3 text-blue-600" />}
                <span className="text-[11px]">Browserbase</span>
              </button>
            )}

            {/* MySQL Status Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-600 border border-slate-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] font-mono">MySQL 8.0</span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
