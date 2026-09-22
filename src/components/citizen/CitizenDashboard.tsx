import React, { useState } from 'react';
import {
  MapPin,
  ShieldCheck,
  Plus,
  Sparkles,
  Lock,
  ListFilter,
  CheckCircle2,
  Volume2
} from 'lucide-react';
import { useIncidents } from '../../context/IncidentContext';
import { useAuth } from '../../context/AuthContext';
import { IncidentFeed } from '../feed/IncidentFeed';
import { IncidentCard } from '../feed/IncidentCard';
import { IncidentReport } from '../../types';
import { CitizenChatbot } from './CitizenChatbot';
import { SafeRouteModal } from '../routing/SafeRouteModal';
import { ReportIntegrityModal } from '../integrity/ReportIntegrityModal';

interface CitizenDashboardProps {
  onSelectReport: (report: IncidentReport) => void;
}

export const CitizenDashboard: React.FC<CitizenDashboardProps> = ({ onSelectReport }) => {
  const {
    reports,
    setIsReportingModalOpen,
    testLoudAlertSound,
    isSafeRouteModalOpen,
    setIsSafeRouteModalOpen,
    isIntegrityModalOpen,
    setIsIntegrityModalOpen
  } = useIncidents();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'feed' | 'my_reports'>('feed');

  // Filter reports submitted by current citizen
  const myReports = reports.filter(
    (r) => r.reporterId === currentUser.id || (!r.isAnonymous && r.reporterName === currentUser.name)
  );

  return (
    <div className="space-y-4">
      {/* Quick Action Hero Card - Warm Beige Theme */}
      <div className="bg-[#f4ebe0] text-slate-900 rounded-xl p-4 sm:p-5 border border-[#ded1be] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 px-2 py-0.5 rounded border border-purple-200">
                Verified Citizen Portal
              </span>
              <span className="text-xs text-slate-600">Welcome, {currentUser.name}</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Community Incident & Hazard Reporter
            </h2>
            <p className="text-xs text-slate-700 max-w-lg leading-relaxed">
              Report potholes, water leaks, unlit corridors, or active hazards with automated EXIF photo verification, precise GPS map pinning, and voice memos.
            </p>
          </div>

          <div className="flex-shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div
              id="citizen-active-profile-badge"
              className="px-3 py-1.5 bg-[#ede4d4] text-slate-800 border border-[#d8cdbc] text-xs font-medium rounded-lg flex items-center justify-center space-x-1.5"
              title="Verified Citizen Reporter Identity"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span className="truncate max-w-[140px]">{currentUser.name}</span>
            </div>

            {/* Emergency Buzzer - In Red */}
            <button
              type="button"
              id="btn-citizen-test-emergency-buzzer"
              onClick={testLoudAlertSound}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white border border-red-500 text-xs font-semibold rounded-lg flex items-center justify-center shadow-xs transition-all active:scale-95"
              title="Test emergency alert buzzer"
            >
              <span>Emergency Buzzer</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights Pill Bar */}
        <div className="pt-2.5 border-t border-[#ded1be] flex flex-wrap items-center gap-3 text-[11px] text-slate-700">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Automated EXIF Geotags</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-purple-700" />
            <span>Safety Anonymity Shield</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Safe-Route Bypass Engine</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
            <span>Multi-Vector Anti-Duplicate Hashing</span>
          </div>
        </div>
      </div>

      {/* Citizen Tab Switcher: All Community Reports vs My Submissions - Light Purple Buttons */}
      <div className="flex items-center space-x-2 pb-1 text-xs">
        <button
          type="button"
          id="btn-tab-all-community-reports"
          onClick={() => setActiveTab('feed')}
          className={`px-3 py-1.5 rounded-lg border font-semibold transition-all shadow-xs flex items-center space-x-1.5 active:scale-95 ${
            activeTab === 'feed'
              ? 'bg-purple-200 text-purple-950 border-purple-400 font-bold shadow-xs'
              : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200'
          }`}
        >
          <span>All Community Reports</span>
          <span
            className={`text-[11px] px-1.5 py-0.2 rounded-md font-semibold ${
              activeTab === 'feed'
                ? 'bg-purple-300 text-purple-950'
                : 'bg-purple-100 text-purple-800'
            }`}
          >
            {reports.length}
          </span>
        </button>

        <button
          type="button"
          id="btn-tab-my-submissions"
          onClick={() => setActiveTab('my_reports')}
          className={`px-3 py-1.5 rounded-lg border font-semibold transition-all shadow-xs flex items-center space-x-1.5 active:scale-95 ${
            activeTab === 'my_reports'
              ? 'bg-purple-200 text-purple-950 border-purple-400 font-bold shadow-xs'
              : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-200'
          }`}
        >
          <span>My Submissions</span>
          <span
            className={`text-[11px] px-1.5 py-0.2 rounded-md font-semibold ${
              activeTab === 'my_reports'
                ? 'bg-purple-300 text-purple-950'
                : 'bg-purple-100 text-purple-800'
            }`}
          >
            {myReports.length}
          </span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'feed' ? (
        <IncidentFeed onSelectReport={onSelectReport} />
      ) : (
        <div>
          {myReports.length === 0 ? (
            <div className="bg-[#fbf9f4] rounded-xl border border-[#ded1be] p-8 text-center space-y-3 text-slate-900 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#ede4d4] text-slate-500 mx-auto flex items-center justify-center border border-[#d8cdbc]">
                <CheckCircle2 className="w-6 h-6 text-slate-500" />
              </div>
              <h4 className="text-sm font-semibold text-slate-900">No reports submitted yet</h4>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                Spot a road pothole, dark alley, or water leak? Submit a report with EXIF evidence.
              </p>
              {/* Report Issue Action Button - IN RED */}
              <button
                type="button"
                onClick={() => setIsReportingModalOpen(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm border border-red-500 transition-all active:scale-95"
              >
                Report First Incident Issue
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myReports.map((report) => (
                <IncidentCard
                  key={report.id}
                  report={report}
                  onOpenDetail={onSelectReport}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Safe-Route Suggestions Modal (Triggerable from Feed & Chatbot) */}
      <SafeRouteModal
        isOpen={isSafeRouteModalOpen}
        onClose={() => setIsSafeRouteModalOpen(false)}
        onSelectReport={(id) => {
          const rep = reports.find((r) => r.id === id);
          if (rep) onSelectReport(rep);
        }}
      />

      {/* Fake and Duplicate Report Detection Scanner Modal */}
      <ReportIntegrityModal
        isOpen={isIntegrityModalOpen}
        onClose={() => setIsIntegrityModalOpen(false)}
        onSelectReport={onSelectReport}
      />

      {/* Floating Citizen Chatbot Copilot - Present ONLY in Citizen Reporter Portal */}
      <CitizenChatbot
        onSelectReport={onSelectReport}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
};
