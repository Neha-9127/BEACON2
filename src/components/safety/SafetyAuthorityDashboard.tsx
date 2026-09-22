import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Radio,
  Lock,
  Compass,
  CheckCircle2,
  PhoneCall,
  Flame,
  UserCheck
} from 'lucide-react';
import { useIncidents } from '../../context/IncidentContext';
import { useAuth } from '../../context/AuthContext';
import { IncidentCard } from '../feed/IncidentCard';
import { IncidentReport } from '../../types';

interface SafetyAuthorityDashboardProps {
  onSelectReport: (report: IncidentReport) => void;
}

export const SafetyAuthorityDashboard: React.FC<SafetyAuthorityDashboardProps> = ({
  onSelectReport
}) => {
  const { reports } = useIncidents();
  const { currentUser } = useAuth();
  const [severityTab, setSeverityTab] = useState<'all' | 'emergency' | 'high'>('all');

  // Filter only safety reports
  const safetyReports = reports.filter((r) => r.domain === 'safety');

  const emergencyCount = safetyReports.filter((r) => r.severity === 'emergency' && r.status !== 'resolved').length;
  const highCount = safetyReports.filter((r) => r.severity === 'high' && r.status !== 'resolved').length;

  const displayedReports = safetyReports.filter((r) => {
    if (severityTab === 'emergency') return r.severity === 'emergency';
    if (severityTab === 'high') return r.severity === 'high';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Safety Authority Command Header - Warm Beige Theme */}
      <div className="bg-[#f4ebe0] text-slate-900 rounded-2xl p-4 sm:p-5 border border-[#ded1be] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ded1be] pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 border border-purple-200 flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-purple-900 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
                <span>Local Safety Authority & Emergency Dispatch</span>
              </div>
              <h2 className="text-base font-bold text-slate-900">
                {currentUser.name} • Badge #{currentUser.badgeNumber || 'SF-SHIELD-489'}
              </h2>
            </div>
          </div>
          <div className="text-xs text-slate-600">
            Sector: <strong className="text-slate-900">Metro Central High-Alert Division</strong>
          </div>
        </div>

        {/* Priority Triage Metrics */}
        <div className="grid grid-cols-3 gap-2.5 text-center pt-1">
          <div className="bg-[#ede4d4] p-3 rounded-xl border border-[#d8cdbc]">
            <div className="text-xl font-bold text-red-600">{emergencyCount}</div>
            <div className="text-[10px] uppercase font-semibold text-slate-700 mt-0.5">Emergency Hazards</div>
          </div>
          <div className="bg-[#ede4d4] p-3 rounded-xl border border-[#d8cdbc]">
            <div className="text-xl font-bold text-purple-900">{highCount}</div>
            <div className="text-[10px] uppercase font-semibold text-slate-700 mt-0.5">High Priority Alerts</div>
          </div>
          <div className="bg-[#ede4d4] p-3 rounded-xl border border-[#d8cdbc]">
            <div className="text-xl font-bold text-emerald-700">100%</div>
            <div className="text-[10px] uppercase font-semibold text-slate-700 mt-0.5">GPS Locked (EXIF)</div>
          </div>
        </div>

        {/* Anonymity Protocol Information */}
        <div className="p-3 bg-[#ede4d4] rounded-xl border border-[#d8cdbc] flex items-start space-x-2.5 text-xs text-slate-700">
          <Lock className="w-4 h-4 text-purple-700 flex-shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong className="text-slate-900">Anonymity Shield Protocol:</strong> Reporting citizens who engaged the privacy toggle have their personal identity hashed. High-precision hardware GPS coordinates and live EXIF camera streams are preserved for emergency tactical deployment.
          </div>
        </div>
      </div>

      {/* Severity Filter Tabs - Light Purple Buttons */}
      <div className="flex items-center space-x-2 text-xs">
        <button
          type="button"
          onClick={() => setSeverityTab('all')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all border ${
            severityTab === 'all'
              ? 'bg-purple-300 text-purple-950 border-purple-400 font-bold shadow-xs'
              : 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-200'
          }`}
        >
          All Safety Reports ({safetyReports.length})
        </button>

        <button
          type="button"
          onClick={() => setSeverityTab('emergency')}
          className={`px-3 py-1.5 rounded-xl font-semibold flex items-center space-x-1.5 transition-all border ${
            severityTab === 'emergency'
              ? 'bg-purple-300 text-purple-950 border-purple-400 font-bold shadow-xs'
              : 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-purple-800" />
          <span>Active Emergencies ({emergencyCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setSeverityTab('high')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all border ${
            severityTab === 'high'
              ? 'bg-purple-300 text-purple-950 border-purple-400 font-bold shadow-xs'
              : 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-200'
          }`}
        >
          High Alerts ({highCount})
        </button>
      </div>

      {/* Grid of Safety Incident Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedReports.map((report) => (
          <IncidentCard
            key={report.id}
            report={report}
            onOpenDetail={onSelectReport}
          />
        ))}
      </div>
    </div>
  );
};
