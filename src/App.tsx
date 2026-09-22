import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { IncidentProvider, useIncidents } from './context/IncidentContext';
import { Header } from './components/common/Header';
import { CitizenDashboard } from './components/citizen/CitizenDashboard';
import { OperatorDashboard } from './components/operator/OperatorDashboard';
import { SafetyAuthorityDashboard } from './components/safety/SafetyAuthorityDashboard';
import { AdminTriageConsole } from './components/admin/AdminTriageConsole';
import { IncidentDetailModal } from './components/feed/IncidentDetailModal';
import { IncidentReportModal } from './components/reporting/IncidentReportModal';
import { UnifiedLoginModal } from './components/auth/UnifiedLoginModal';
import { LoginPage } from './components/auth/LoginPage';
import { LiveCivicBackground } from './components/common/LiveCivicBackground';
import { SafetyAlertBanner } from './components/common/SafetyAlertBanner';
import { WebhookInspectorModal } from './components/operator/WebhookInspectorModal';
import { ResolutionProofModal } from './components/operator/ResolutionProofModal';
import { IncidentReport } from './types';
import { Plus, Camera, Wifi, Battery, Signal, CheckCircle2, Trash2, X } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentRole, isAuthenticated } = useAuth();
  const {
    reports,
    setIsReportingModalOpen,
    isResolutionProofModalOpen,
    closeResolutionProofModal,
    resolvingReport,
    confirmResolutionWithProof,
    resolvedNotice,
    dismissResolvedNotice
  } = useIncidents();
  const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);

  // If not authenticated, render the dedicated separate Login Page to secure all dashboard details
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderDashboardByRole = () => {
    switch (currentRole) {
      case 'admin':
        return <AdminTriageConsole onSelectReport={setSelectedReport} />;
      case 'operator':
        return <OperatorDashboard onSelectReport={setSelectedReport} />;
      case 'safety':
        return <SafetyAuthorityDashboard onSelectReport={setSelectedReport} />;
      default:
        return <CitizenDashboard onSelectReport={setSelectedReport} />;
    }
  };

  return (
    <div className={`min-h-screen bg-[#f7f4ed] text-slate-900 flex flex-col justify-center items-center relative ${isMobileFrame ? 'py-6 px-4' : ''}`}>
      {/* Responsive Live Civic Background */}
      <LiveCivicBackground />

      {/* Auto-Purge & Stability / Deletion Notification Toast */}
      {resolvedNotice && (
        <div
          className={`fixed top-4 right-4 left-4 sm:left-auto sm:max-w-md z-[100] p-3.5 rounded-xl shadow-xl border flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300 bg-[#fdfbf7] text-slate-900 ${
            resolvedNotice.ticketNumber.includes('DELETE') || resolvedNotice.title.toLowerCase().includes('delete')
              ? 'border-l-4 border-l-red-600 border-[#e2d8c7]'
              : 'border-l-4 border-l-emerald-600 border-[#e2d8c7]'
          }`}
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                resolvedNotice.ticketNumber.includes('DELETE') || resolvedNotice.title.toLowerCase().includes('delete')
                  ? 'bg-red-50 text-red-600'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              {resolvedNotice.ticketNumber.includes('DELETE') || resolvedNotice.title.toLowerCase().includes('delete') ? (
                <Trash2 className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div
                className={`text-[10px] font-mono uppercase font-bold flex items-center space-x-1.5 ${
                  resolvedNotice.ticketNumber.includes('DELETE') || resolvedNotice.title.toLowerCase().includes('delete')
                    ? 'text-red-700'
                    : 'text-emerald-700'
                }`}
              >
                <span>
                  {resolvedNotice.ticketNumber.includes('DELETE') || resolvedNotice.title.toLowerCase().includes('delete')
                    ? 'INCIDENT DELETED'
                    : 'ISSUE RESOLVED & VERIFIED'}
                </span>
                {!resolvedNotice.title.toLowerCase().includes('delete') && (
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded font-bold">STABILITY +1</span>
                )}
              </div>
              <div className="text-xs font-semibold text-slate-800 truncate">
                {resolvedNotice.title}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissResolvedNotice}
            className="p-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-200 rounded-lg transition-colors flex-shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Geo-Fenced Push Alert Notification Banner */}
      <SafetyAlertBanner
        onSelectReportById={(id) => {
          const rep = reports.find((r) => r.id === id);
          if (rep) setSelectedReport(rep);
        }}
      />

      {/* Mobile Frame Container (when toggled on for mobile app simulation) or Centered Desktop Command Frame */}
      <div
        className={`w-full transition-all duration-300 ${
          isMobileFrame
            ? 'max-w-[420px] bg-[#f7f4ed] rounded-[44px] shadow-2xl border-[10px] border-slate-800 overflow-hidden flex flex-col min-h-[850px] max-h-[92vh] text-slate-900'
            : 'max-w-7xl flex-1 flex flex-col bg-[#f7f4ed]/90 sm:my-3 min-h-screen text-slate-900 shadow-sm border border-[#e8dfd0] rounded-2xl overflow-hidden'
        }`}
      >
        {/* Mobile Device Status Bar (only shown in mobile frame mode) */}
        {isMobileFrame && (
          <div className="bg-slate-900 px-6 pt-3 pb-1 flex items-center justify-between text-xs text-white select-none border-b border-slate-800">
            <span className="font-semibold text-[11px] font-mono">9:41</span>
            {/* Dynamic Island / Notch Pill */}
            <div className="w-20 h-4 bg-slate-950 rounded-full mx-auto" />
            <div className="flex items-center space-x-1.5 text-slate-300">
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <Battery className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {/* Global Navigation Header (Top task bar with BEACON) */}
        <Header
          isMobileFrame={isMobileFrame}
          onToggleMobileFrame={() => setIsMobileFrame(!isMobileFrame)}
        />

        {/* PROMINENT HERO CAPTION BANNER: Spot it early . Settle it fast. */}
        <section
          id="hero-early-warning-caption"
          className="w-full bg-[#eee5d5] border-b border-[#ddceba] py-5 sm:py-7 px-4 text-center shadow-xs transition-colors"
        >
          <div className="max-w-4xl mx-auto space-y-1.5">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              “Spot it early . Settle it fast.”
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-700 tracking-wide">
              Hyperlocal Early-Warning Infrastructure & Rapid Civic Incident Triage
            </p>
          </div>
        </section>

        {/* Main App Content Area (Dashboard) */}
        <main className="flex-1 p-3 sm:p-5 overflow-y-auto bg-[#f7f4ed]">
          {renderDashboardByRole()}
        </main>

        {/* Mobile Bottom Floating Quick-Report Button - IN RED */}
        <div className="sticky bottom-3 right-3 left-3 flex justify-end pointer-events-none p-2 sm:hidden z-30">
          <button
            type="button"
            onClick={() => setIsReportingModalOpen(true)}
            className="pointer-events-auto w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl flex items-center justify-center transition-transform active:scale-95 border-2 border-red-500"
            title="Report Issue"
          >
            <Camera className="w-7 h-7" />
          </button>
        </div>

        {/* Modals & Dialogs */}
        <IncidentDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
        <IncidentReportModal />
        {/* Single Unified Login Page for Citizen and Authority */}
        <UnifiedLoginModal />
        <WebhookInspectorModal />
        <ResolutionProofModal
          isOpen={isResolutionProofModalOpen}
          onClose={closeResolutionProofModal}
          report={resolvingReport}
          onConfirmResolution={confirmResolutionWithProof}
        />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <IncidentProvider>
        <AppContent />
      </IncidentProvider>
    </AuthProvider>
  );
}
