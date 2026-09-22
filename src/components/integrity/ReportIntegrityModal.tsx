import React, { useState, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Clock,
  MapPin,
  Camera,
  Layers,
  Sparkles,
  CheckCircle2,
  Search,
  Filter,
  ArrowRight
} from 'lucide-react';
import { useIncidents } from '../../context/IncidentContext';
import { IncidentReport, ReportIntegrityAudit } from '../../types';
import { auditAllReportsIntegrity, checkReportIntegrity, generateSimpleImageHash } from '../../utils/reportIntegrity';

interface ReportIntegrityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReport?: (report: IncidentReport) => void;
}

export const ReportIntegrityModal: React.FC<ReportIntegrityModalProps> = ({
  isOpen,
  onClose,
  onSelectReport
}) => {
  const { reports, mergeDuplicateReports } = useIncidents();
  const [filterType, setFilterType] = useState<'all' | 'duplicate' | 'fake'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [testSelectedReportId, setTestSelectedReportId] = useState<string>(
    reports[0]?.id || ''
  );
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Compile audit matrix for all active reports
  const auditResults: ReportIntegrityAudit[] = useMemo(() => {
    return auditAllReportsIntegrity(reports);
  }, [reports]);

  // Statistics
  const stats = useMemo(() => {
    const total = auditResults.length;
    const duplicates = auditResults.filter((r) => r.isDuplicate).length;
    const fakes = auditResults.filter((r) => r.isSuspectedFake).length;
    const clean = total - duplicates - fakes;
    const avgIntegrity = Math.round(
      auditResults.reduce((acc, r) => acc + (100 - r.fakeRiskScore - (r.duplicateConfidence * 0.4)), 0) / (total || 1)
    );
    return { total, duplicates, fakes, clean, avgIntegrity: Math.max(10, Math.min(100, avgIntegrity)) };
  }, [auditResults]);

  // Filtered List
  const filteredAudits = useMemo(() => {
    return auditResults.filter((item) => {
      if (filterType === 'duplicate' && !item.isDuplicate) return false;
      if (filterType === 'fake' && !item.isSuspectedFake) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.ticketNumber.toLowerCase().includes(q) ||
          item.imageHash.toLowerCase().includes(q) ||
          (item.matchedTicketNumber && item.matchedTicketNumber.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [auditResults, filterType, searchQuery]);

  // Live tester candidate report
  const selectedTestReport = useMemo(() => {
    return reports.find((r) => r.id === testSelectedReportId) || reports[0];
  }, [reports, testSelectedReportId]);

  const testAnalysis = useMemo(() => {
    if (!selectedTestReport) return null;
    const others = reports.filter((r) => r.id !== selectedTestReport.id);
    return checkReportIntegrity(
      {
        title: selectedTestReport.title,
        description: selectedTestReport.description,
        categoryId: selectedTestReport.categoryId,
        subcategory: selectedTestReport.subcategory,
        location: selectedTestReport.location,
        imageUrl: selectedTestReport.imageUrl,
        exifGps: selectedTestReport.exifData?.originalGps,
        createdAt: selectedTestReport.createdAt
      },
      others
    );
  }, [selectedTestReport, reports]);

  const handleMerge = (primaryId: string, duplicateId: string) => {
    mergeDuplicateReports(primaryId, [duplicateId]);
    setActionNotice(`Successfully consolidated duplicate into primary ticket #${primaryId}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="report-integrity-detection-modal"
        className="relative w-full max-w-4xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-900"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold tracking-tight flex items-center space-x-2">
                <span>Fake & Duplicate Report Detection</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-semibold">
                  Image Hash • Spatial • Temporal
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Multi-vector validation: visual perceptual hashing, GPS proximity radius, and temporal windows
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Close Integrity Scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
            <div className="text-[10px] text-slate-500 font-mono uppercase font-semibold">Audited Reports</div>
            <div className="text-lg font-bold text-slate-900">{stats.total}</div>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-amber-200 shadow-xs">
            <div className="text-[10px] text-amber-600 font-mono uppercase font-semibold">Duplicates Flagged</div>
            <div className="text-lg font-bold text-amber-700">{stats.duplicates}</div>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-rose-200 shadow-xs">
            <div className="text-[10px] text-rose-600 font-mono uppercase font-semibold">Suspected Fakes</div>
            <div className="text-lg font-bold text-rose-700">{stats.fakes}</div>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-xs">
            <div className="text-[10px] text-emerald-600 font-mono uppercase font-semibold">Platform Integrity</div>
            <div className="text-lg font-bold text-emerald-700">{stats.avgIntegrity}%</div>
          </div>
        </div>

        {/* Toast */}
        {actionNotice && (
          <div className="mx-5 mt-3 p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
            <span className="font-medium">{actionNotice}</span>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold px-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Section 1: Live Interactive Test Bench */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div>
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  Live Report Integrity Inspector
                </span>
                <p className="text-[11px] text-slate-500">
                  Select any active ticket to inspect its perceptual image hash, GPS delta, and temporal collision
                </p>
              </div>
              <select
                value={testSelectedReportId}
                onChange={(e) => setTestSelectedReportId(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              >
                {reports.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    #{rep.ticketNumber} - {rep.title.slice(0, 32)}...
                  </option>
                ))}
              </select>
            </div>

            {selectedTestReport && testAnalysis && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {/* Visual Image & Hash */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                    <span>1. Image Hash Analysis</span>
                    <span className="text-[9px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 font-semibold">
                      pHash 64-bit
                    </span>
                  </div>
                  {selectedTestReport.imageUrl ? (
                    <img
                      src={selectedTestReport.imageUrl}
                      alt="Incident evidence"
                      className="w-full h-24 object-cover rounded-lg border border-slate-200"
                    />
                  ) : (
                    <div className="w-full h-24 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-xs text-slate-400">
                      No photo attached
                    </div>
                  )}
                  <div className="text-[10px] font-mono text-slate-600 break-all bg-slate-100 p-1.5 rounded">
                    dHash: {testAnalysis.candidateImageHash}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Visual similarity to database: <span className="font-semibold text-indigo-700">{testAnalysis.imageHashSimilarity}%</span>
                  </div>
                </div>

                {/* Spatial Proximity Check */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                    <span>2. Spatial & Location Check</span>
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg text-xs space-y-1 border border-slate-200">
                    <div className="text-slate-500 text-[10px] uppercase font-mono font-semibold">Location</div>
                    <div className="font-semibold text-slate-900 truncate">{selectedTestReport.location.address || selectedTestReport.location.neighborhood}</div>
                    <div className="text-[11px] text-slate-600 pt-1">
                      Distance to closest incident:
                    </div>
                    <div className="text-sm font-bold text-blue-600 font-mono">
                      {testAnalysis.spatialDistanceMeters} meters
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Threshold: &lt; 150m triggers automatic spatial collision check.
                  </div>
                </div>

                {/* Time Check & Verdict */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                    <span>3. Time Delta & Verdict</span>
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg text-xs space-y-1 border border-slate-200">
                    <div className="text-slate-500 text-[10px] uppercase font-mono font-semibold">Temporal Interval</div>
                    <div className="font-semibold text-slate-900">
                      {testAnalysis.timeDeltaHours} hours elapsed
                    </div>
                    <div className="pt-1 text-[10px] uppercase font-mono text-slate-500 font-semibold">Integrity Score</div>
                    <div className={`text-base font-bold ${
                      testAnalysis.integrityScore > 75 ? 'text-emerald-600' : testAnalysis.integrityScore > 40 ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                      {testAnalysis.integrityScore}/100 • {testAnalysis.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-600 leading-tight">
                    {testAnalysis.actionPrompt}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Audit List of Flagged Reports */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterType === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All Audits ({auditResults.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('duplicate')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterType === 'duplicate'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Duplicates ({stats.duplicates})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('fake')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filterType === 'fake'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Fake Flags ({stats.fakes})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter ticket or hash..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredAudits.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  No flagged reports match current filter criteria.
                </div>
              ) : (
                filteredAudits.map((item) => {
                  const rep = reports.find((r) => r.id === item.reportId);
                  if (!rep) return null;
                  return (
                    <div
                      key={item.reportId}
                      className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        item.isSuspectedFake
                          ? 'bg-rose-50/70 border-rose-200'
                          : item.isDuplicate
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${
                              item.isSuspectedFake
                                ? 'bg-rose-600 text-white'
                                : item.isDuplicate
                                ? 'bg-amber-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {item.integrityRating.replace('_', ' ')}
                          </span>
                          <span className="font-mono text-xs font-semibold text-slate-900">
                            #{item.ticketNumber}
                          </span>
                          <span className="text-xs text-slate-700 font-medium truncate">
                            {rep.title}
                          </span>
                        </div>

                        {/* Reason Flags */}
                        <div className="mt-1.5 text-[11px] text-slate-600 space-y-0.5">
                          {item.reasonFlags.length > 0 ? (
                            item.reasonFlags.map((flag, idx) => (
                              <div key={idx} className="flex items-start space-x-1.5">
                                <span className="text-slate-400">•</span>
                                <span>{flag}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-emerald-700 text-[11px] font-medium">
                              Unique perceptual hash & verified geo-location.
                            </div>
                          )}
                        </div>

                        <div className="mt-1 flex items-center space-x-3 text-[10px] font-mono text-slate-500">
                          <span>Hash: {item.imageHash.slice(0, 12)}...</span>
                          <span>GPS Delta: {item.spatialDistanceMeters}m</span>
                          <span>Time Delta: {item.timeDeltaHours}h</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {item.isDuplicate && item.matchedReportId && (
                          <button
                            type="button"
                            onClick={() => handleMerge(item.matchedReportId!, item.reportId)}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                          >
                            Merge into #{item.matchedTicketNumber}
                          </button>
                        )}
                        {onSelectReport && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectReport(rep);
                              onClose();
                            }}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-xs"
                          >
                            View Ticket
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
