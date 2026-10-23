import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import AICoordinator from './components/AICoordinator';
import CarePlan from './components/CarePlan';
import SharedCalendar from './components/SharedCalendar';
import MockPortals from './components/MockPortals';
import ApprovalCenter from './components/ApprovalCenter';
import TestCenter from './components/TestCenter';
import { HeartHandshake, Shield, Database, Terminal, UserCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentRun, setCurrentRun] = useState(null);
  const [selectedTestCase, setSelectedTestCase] = useState(null);
  const [browserbaseSession, setBrowserbaseSession] = useState(null);
  const [familyList, setFamilyList] = useState([]);
  
  // Simulated logged-in member context (defaults to Arun, primary caregiver)
  const [currentUser, setCurrentUser] = useState({
    name: 'Arun',
    role: 'Primary Caregiver',
    consentMedicalDetails: true,
  });

  useEffect(() => {
    fetch('/api/family')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFamilyList(data);
          // Match default Arun
          const arun = data.find((m) => m.name === 'Arun');
          if (arun) setCurrentUser(arun);
        }
      })
      .catch((e) => console.error('Error fetching family:', e));
  }, []);

  const handlePlanCreated = (run) => {
    setCurrentRun(run);
  };

  const handleRunScenario = (scId) => {
    setSelectedTestCase(scId);
    setActiveTab('tests');
  };

  const handleActionCompleted = (run) => {
    setCurrentRun(run);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navbar with Family Member Login Switcher */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        browserbaseSession={browserbaseSession} 
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        familyList={familyList}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
        {activeTab === 'dashboard' && (
          <Dashboard 
            setActiveTab={setActiveTab} 
            onRunScenario={handleRunScenario}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'coordinator' && (
          <AICoordinator 
            onPlanCreated={handlePlanCreated} 
            setActiveTab={setActiveTab}
            browserbaseSession={browserbaseSession}
            setBrowserbaseSession={setBrowserbaseSession}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'careplan' && (
          <CarePlan 
            currentRun={currentRun} 
            setActiveTab={setActiveTab} 
            currentUser={currentUser}
          />
        )}

        {activeTab === 'calendar' && (
          <SharedCalendar 
            currentUser={currentUser}
          />
        )}

        {activeTab === 'portals' && (
          <MockPortals />
        )}

        {activeTab === 'approvals' && (
          <ApprovalCenter 
            currentRun={currentRun} 
            onActionCompleted={handleActionCompleted} 
            setActiveTab={setActiveTab} 
            currentUser={currentUser}
          />
        )}

        {activeTab === 'tests' && (
          <TestCenter 
            selectedTestCase={selectedTestCase} 
            onRunCompleted={handleActionCompleted} 
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 text-xs text-slate-500 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-800">CareSync AI</span>
            <span>• Caregiver Coordination Platform</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" /> 
              Session: <b>{currentUser?.name}</b> ({currentUser?.role})
            </span>
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-600" /> MySQL 8.0
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-600" /> Consent Guarded
            </span>
          </div>

          <div className="text-slate-400 text-[11px]">
            Synthetic Healthcare Data • Multi-Sibling Role Security
          </div>
        </div>
      </footer>
    </div>
  );
}
