import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Building2,
  CheckCircle2,
  AlertTriangle,
  GitMerge,
  Filter,
  Search,
  Layers,
  BarChart3,
  MapPin,
  Truck,
  Clock,
  UserCheck,
  ChevronRight,
  ExternalLink,
  Camera,
  Server,
  ThumbsUp,
  RefreshCw,
  Flame,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Trash2,
  Volume2,
  ImageOff,
  Sparkles,
  RadioTower
} from 'lucide-react';
import { IncidentReport, IncidentStatus, SeverityLevel, isAiAutoReport } from '../../types';
import { useIncidents } from '../../context/IncidentContext';
import { useAuth } from '../../context/AuthContext';
import { AnalyticsDashboardView } from './AnalyticsDashboardView';
import { DuplicateMergeModal } from './DuplicateMergeModal';
import { IncidentMap } from '../map/IncidentMap';

interface AdminTriageConsoleProps {
  onSelectReport: (report: IncidentReport) => void;
}

const AGENCIES = [
  { id: 'all', name: 'All Municipal & Safety Agencies' },
  { id: 'Department of Transportation & Roads', name: 'Dept of Transportation & Roads' },
  { id: 'Municipal Sanitation Bureau', name: 'Sanitation Bureau' },
  { id: 'Bureau of Street Lighting', name: 'Street Lighting Bureau' },
  { id: 'Municipal Water & Sewerage Agency', name: 'Water & Sewerage Agency' },
  { id: 'Metropolitan Safety & Emergency Command', name: 'Safety & Emergency Command' }
];

export const AdminTriageConsole: React.FC<AdminTriageConsoleProps> = ({ onSelectReport }) => {
  const {
    reports,
    bulkUpdateStatus,
    bulkAssignDepartment,
    openWebhookInspector,
    openResolutionProofModal,
    deleteReport,
    deleteReportImage,
    bulkDeleteReports,
    ringEmergencyBuzzer
  } = useIncidents();
  const { currentUser, isAuthority } = useAuth();

  // Active View Tab: 'triage' | 'analytics' | 'heatmap'
  const [activeTab, setActiveTab] = useState<'triage' | 'analytics' | 'heatmap'>('triage');

  // Filters
  const [selectedAgency, setSelectedAgency] = useState<string>('all');
  const [filterDomain, setFilterDomain] = useState<'all' | 'civic' | 'safety'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterZone, setFilterZone] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Bulk Selection
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [bulkStatusTarget, setBulkStatusTarget] = useState<IncidentStatus>('in_progress');
  const [bulkAgencyTarget, setBulkAgencyTarget] = useState<string>(
    'Department of Transportation & Roads'
  );
  const [bulkCrewTarget, setBulkCrewTarget] = useState<string>('Rapid Response Alpha');
  const [bulkNoteInput, setBulkNoteInput] = useState<string>('');
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState<boolean>(false);

  // Duplicate Merge Modal State
  const [mergePrimaryReport, setMergePrimaryReport] = useState<IncidentReport | null>(null);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState<boolean>(false);

  // Dedicated In-App Incident Deletion Confirmation Modal State
  const [pendingDeleteReport, setPendingDeleteReport] = useState<IncidentReport | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState<boolean>(false);
  const [pendingDeleteImageReport, setPendingDeleteImageReport] = useState<IncidentReport | null>(null);

  const emergencyCount = useMemo(() => {
    return reports.filter((r) => r.severity === 'emergency' && r.status !== 'resolved').length;
  }, [reports]);

  // Filtered Reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // Exclude tickets already merged into other tickets unless searching
      if (r.mergedIntoTicketId && filterStatus !== 'merged') {
        return false;
      }
      if (filterStatus === 'merged' && !r.mergedIntoTicketId) {
        return false;
      }

      // Agency filter
      if (selectedAgency !== 'all') {
        if (
          selectedAgency.includes('Safety') &&
          r.domain !== 'safety' &&
          r.assignedDepartment !== selectedAgency
        ) {
          return false;
        }
        if (
          !selectedAgency.includes('Safety') &&
          r.assignedDepartment !== selectedAgency
        ) {
          return false;
        }
      }

      // Domain filter
      if (filterDomain !== 'all' && r.domain !== filterDomain) return false;

      // Status filter
      if (filterStatus !== 'all' && filterStatus !== 'merged' && r.status !== filterStatus) {
        return false;
      }

      // Severity filter
      if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;

      // Zone filter
      if (filterZone !== 'all' && r.location.neighborhood !== filterZone) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchDesc = r.description.toLowerCase().includes(q);
        const matchTicket = r.ticketNumber.toLowerCase().includes(q);
        const matchAddress = r.location.address.toLowerCase().includes(q);
        const matchCategory = r.categoryName.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchTicket && !matchAddress && !matchCategory) {
          return false;
        }
      }

      return true;
    });
  }, [
    reports,
    selectedAgency,
    filterDomain,
    filterStatus,
    filterSeverity,
    filterZone,
    searchQuery
  ]);

  // Bulk Selection Helpers
  const handleSelectAll = () => {
    if (selectedReportIds.length === filteredReports.length) {
      setSelectedReportIds([]);
    } else {
      setSelectedReportIds(filteredReports.map((r) => r.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    if (selectedReportIds.includes(id)) {
      setSelectedReportIds(selectedReportIds.filter((item) => item !== id));
    } else {
      setSelectedReportIds([...selectedReportIds, id]);
    }
  };

  const handleExecuteBulkStatus = () => {
    if (selectedReportIds.length === 0) return;
    bulkUpdateStatus(
      selectedReportIds,
      bulkStatusTarget,
      bulkNoteInput || `Bulk status update to ${bulkStatusTarget}`
    );
    setSelectedReportIds([]);
    setBulkNoteInput('');
  };

  const handleExecuteBulkAssign = () => {
    if (selectedReportIds.length === 0) return;
    bulkAssignDepartment(selectedReportIds, bulkAgencyTarget, bulkCrewTarget);
    setIsBulkAssignOpen(false);
    setSelectedReportIds([]);
  };

  const handleOpenMergeWithSelected = () => {
    if (selectedReportIds.length === 0) return;
    const primary = reports.find((r) => r.id === selectedReportIds[0]);
    if (primary) {
      setMergePrimaryReport(primary);
      setIsMergeModalOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Multi-Agency Console Command Header - Warm Beige Theme */}
      <div className="bg-[#f4ebe0] text-slate-900 rounded-xl p-4 sm:p-5 shadow-xs border border-[#ded1be] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ded1be] pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-purple-200 text-purple-900 border border-purple-300 flex items-center justify-center font-bold text-sm shadow-xs">
              <RadioTower className="w-5 h-5 text-purple-900 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-900">
                  BEACON UNIFIED COMMAND
                </span>
                <span className="text-[9px] bg-[#ede4d4] text-slate-800 font-mono px-2 py-0.5 rounded-md border border-[#d8cdbc]">
                  Multi-Agency Ops
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                Admin Triage & Inter-Agency Dispatch Console
              </h1>
            </div>
          </div>

          {/* Tab Navigation Switcher */}
          <div className="flex items-center bg-[#ede4d4] p-1 rounded-lg border border-[#d8cdbc] text-xs">
            <button
              type="button"
              id="tab-admin-triage"
              onClick={() => setActiveTab('triage')}
              className={`px-3.5 py-1.5 rounded-md font-semibold flex items-center space-x-1.5 transition-all ${
                activeTab === 'triage'
                  ? 'bg-purple-300 text-purple-950 border border-purple-400 font-bold shadow-xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Triage Queue ({filteredReports.length})</span>
            </button>

            <button
              type="button"
              id="tab-admin-analytics"
              onClick={() => setActiveTab('analytics')}
              className={`px-3.5 py-1.5 rounded-md font-semibold flex items-center space-x-1.5 transition-all ${
                activeTab === 'analytics'
                  ? 'bg-purple-300 text-purple-950 border border-purple-400 font-bold shadow-xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics & Bottlenecks</span>
            </button>

            <button
              type="button"
              id="tab-admin-heatmap"
              onClick={() => setActiveTab('heatmap')}
              className={`px-3.5 py-1.5 rounded-md font-semibold flex items-center space-x-1.5 transition-all ${
                activeTab === 'heatmap'
                  ? 'bg-purple-300 text-purple-950 border border-purple-400 font-bold shadow-xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Spatial Heatmap</span>
            </button>
          </div>
        </div>

        {/* Agency Filter Bar */}
        <div className="space-y-1.5 pt-0.5">
          <div className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
            <Building2 className="w-3.5 h-3.5 text-purple-800" />
            <span>Participating Municipal Agency / Dispatch Jurisdiction:</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {AGENCIES.map((agency) => (
              <button
                key={agency.id}
                type="button"
                onClick={() => setSelectedAgency(agency.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                  selectedAgency === agency.id
                    ? 'bg-purple-300 text-purple-950 border-purple-400 font-bold shadow-xs'
                    : 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-200'
                }`}
              >
                {agency.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Immediate Emergency Alert Buzzer Banner for Authorities */}
      {emergencyCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-900 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-red-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-900">
                  {emergencyCount} CRITICAL EMERGENCY INCIDENT{emergencyCount > 1 ? 'S' : ''} DETECTED
                </span>
                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-mono font-bold border border-red-200">
                  PRIORITY 1
                </span>
              </div>
              <p className="text-xs text-red-700 mt-0.5">
                Audible industrial alert buzzer rings immediately to warn municipal responders, field authorities, and citizens.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-admin-ring-buzzer"
            onClick={() => ringEmergencyBuzzer()}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-all shadow-xs active:scale-95 flex-shrink-0"
            title="Sound Industrial Alert Buzzer"
          >
            <span>Ring Alert Buzzer</span>
          </button>
        </div>
      )}

      {/* Main Tab Views */}
      {activeTab === 'analytics' && <AnalyticsDashboardView />}

      {activeTab === 'heatmap' && (
        <div className="space-y-3">
          <div className="bg-[#fbf9f4] p-3.5 rounded-xl border border-[#ded1be] shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <Flame className="w-4 h-4 text-red-600" />
                <span>Citywide Spatial Density & Bottleneck Heatmap</span>
              </h3>
              <p className="text-[11px] text-slate-600">
                Visual incident concentration across city sectors: Red clusters indicate recurring bottlenecks requiring cross-department intervention.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-800 bg-[#ede4d4] border border-[#ded1be] px-2.5 py-1 rounded-md">
              {filteredReports.length} Active Pins Plotted
            </span>
          </div>

          <div className="bg-[#fbf9f4] rounded-xl border border-[#ded1be] shadow-xs overflow-hidden h-[540px]">
            <IncidentMap reports={filteredReports} onSelectReport={onSelectReport} />
          </div>
        </div>
      )}

      {activeTab === 'triage' && (
        <div className="space-y-3">
          {/* Triage Search & Multi-Filter Bar */}
          <div className="bg-[#fbf9f4] p-3.5 rounded-xl border border-[#ded1be] shadow-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2.5">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ticket #, category, description, address, or neighborhood..."
                  className="w-full text-xs pl-9 pr-4 py-2 bg-white border border-[#ded1be] rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                />
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs bg-white border border-[#ded1be] rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="all">All Statuses</option>
                <option value="reported">Reported (Pending Triage)</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="in_progress">In Progress</option>
                <option value="dispatched">Dispatched</option>
                <option value="resolved">Resolved & Closed</option>
                <option value="merged">Merged Duplicates</option>
              </select>

              {/* Severity Filter */}
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="text-xs bg-white border border-[#ded1be] rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="all">All Severities</option>
                <option value="emergency">Emergency Priority</option>
                <option value="high">High Severity</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              {/* Domain Filter */}
              <select
                value={filterDomain}
                onChange={(e) => setFilterDomain(e.target.value as any)}
                className="text-xs bg-white border border-[#ded1be] rounded-lg px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <option value="all">Civic + Safety</option>
                <option value="civic">Civic Only</option>
                <option value="safety">Safety Only</option>
              </select>
            </div>
          </div>

          {/* Bulk Action & Status Update Bar (Activates when items are selected) */}
          <div className="bg-[#f4ebe0] text-slate-900 p-3 rounded-xl shadow-xs border border-[#ded1be] flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleSelectAll}
                className="flex items-center space-x-1.5 text-slate-700 hover:text-slate-950 font-semibold"
              >
                {selectedReportIds.length > 0 &&
                selectedReportIds.length === filteredReports.length ? (
                  <CheckSquare className="w-4 h-4 text-purple-700" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500" />
                )}
                <span>
                  {selectedReportIds.length === 0
                    ? 'Select All'
                    : `${selectedReportIds.length} Selected`}
                </span>
              </button>

              {selectedReportIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedReportIds([])}
                  className="text-[11px] text-slate-600 hover:text-slate-900 underline"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Action Buttons */}
            {selectedReportIds.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {/* Bulk Status Select */}
                <div className="flex items-center space-x-1">
                  <select
                    value={bulkStatusTarget}
                    onChange={(e) => setBulkStatusTarget(e.target.value as IncidentStatus)}
                    className="bg-white text-slate-900 border border-[#ded1be] rounded-lg px-2 py-1 text-xs font-medium focus:outline-none"
                  >
                    <option value="acknowledged">Acknowledge</option>
                    <option value="in_progress">Set In Progress</option>
                    <option value="dispatched">Dispatch Unit</option>
                    <option value="resolved">Mark Resolved</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleExecuteBulkStatus}
                    className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 font-semibold rounded-lg transition-all shadow-xs active:scale-95"
                  >
                    Apply Status
                  </button>
                </div>

                {/* Bulk Assign Trigger */}
                <button
                  type="button"
                  onClick={() => setIsBulkAssignOpen(!isBulkAssignOpen)}
                  className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 font-semibold rounded-lg border border-purple-300 flex items-center space-x-1.5 transition-all active:scale-95"
                >
                  <Truck className="w-3.5 h-3.5 text-purple-700" />
                  <span>Assign Field Crew</span>
                </button>

                {/* Combine Duplicate Pins Button */}
                <button
                  type="button"
                  onClick={handleOpenMergeWithSelected}
                  className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 font-semibold rounded-lg flex items-center space-x-1.5 border border-purple-300 transition-all active:scale-95"
                >
                  <GitMerge className="w-3.5 h-3.5 text-purple-700" />
                  <span>Combine Duplicate Pins</span>
                </button>

                {/* Bulk Delete Selected */}
                <button
                  type="button"
                  id="btn-admin-bulk-delete"
                  onClick={() => setPendingBulkDelete(true)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg flex items-center space-x-1.5 transition-all active:scale-95"
                  title="Permanently delete selected incident tickets from system"
                >
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                  <span>Delete Selected ({selectedReportIds.length})</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                <div className="text-[11px] text-slate-600">
                  Select one or more tickets to execute bulk status updates, crew dispatches, or duplicate merges.
                </div>
              </div>
            )}
          </div>

          {/* Bulk Assign Drawer (collapsible) */}
          {isBulkAssignOpen && selectedReportIds.length > 0 && (
            <div className="bg-[#ede4d4] border border-[#ded1be] rounded-xl p-3.5 space-y-3 text-xs animate-in slide-in-from-top-2">
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>Assign {selectedReportIds.length} Selected Reports to Agency & Unit</span>
                <button
                  type="button"
                  onClick={() => setIsBulkAssignOpen(false)}
                  className="text-slate-500 hover:text-slate-800 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Target Agency / Department Queue
                  </label>
                  <select
                    value={bulkAgencyTarget}
                    onChange={(e) => setBulkAgencyTarget(e.target.value)}
                    className="w-full bg-white border border-[#ded1be] rounded-lg p-2 text-slate-900 font-medium"
                  >
                    {AGENCIES.filter((a) => a.id !== 'all').map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Response Unit / Crew Name
                  </label>
                  <input
                    type="text"
                    value={bulkCrewTarget}
                    onChange={(e) => setBulkCrewTarget(e.target.value)}
                    placeholder="e.g. Asphalt Maintenance Crew #3"
                    className="w-full bg-white border border-[#ded1be] rounded-lg p-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleExecuteBulkAssign}
                  className="px-4 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 font-semibold rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs"
                >
                  <Truck className="w-3.5 h-3.5 text-purple-700" />
                  <span>Confirm Inter-Agency Dispatch</span>
                </button>
              </div>
            </div>
          )}

          {/* Triage Incident Table / Queue */}
          <div className="bg-[#fbf9f4] rounded-xl border border-[#ded1be] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f4ebe0] border-b border-[#ded1be] text-slate-700 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedReportIds.length > 0 &&
                          selectedReportIds.length === filteredReports.length
                        }
                        onChange={handleSelectAll}
                        className="rounded text-purple-600 focus:ring-purple-500 border-[#ded1be]"
                      />
                    </th>
                    <th className="p-3">Ticket / Domain</th>
                    <th className="p-3">Issue Title & Category</th>
                    <th className="p-3">Location & Zone</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Assigned Agency</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ded1be]">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No incident tickets match the selected multi-agency filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((report) => {
                      const isSelected = selectedReportIds.includes(report.id);
                      const isAi = isAiAutoReport(report);

                      return (
                        <tr
                          key={report.id}
                          className={`hover:bg-[#f4ebe0]/60 transition-colors ${
                            isSelected ? 'bg-purple-50/70' : ''
                          }`}
                        >
                          {/* Selection Checkbox */}
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectRow(report.id)}
                              className="rounded text-purple-600 focus:ring-purple-500 border-[#ded1be]"
                            />
                          </td>

                          {/* Ticket Number & Domain */}
                          <td className="p-3">
                            <div className="font-mono font-semibold text-slate-900 flex items-center space-x-1.5">
                              <span>{report.ticketNumber}</span>
                              {isAi && (
                                <span className="bg-purple-100 text-purple-800 text-[9px] font-semibold px-1.5 py-0.2 rounded font-sans flex items-center space-x-0.5 border border-purple-200">
                                  <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                                  <span>AI</span>
                                </span>
                              )}
                              {report.mergedDuplicateIds && report.mergedDuplicateIds.length > 0 && (
                                <span className="bg-purple-100 text-purple-800 text-[9px] font-semibold px-1.5 py-0.2 rounded font-sans flex items-center space-x-0.5 border border-purple-200">
                                  <GitMerge className="w-2.5 h-2.5" />
                                  <span>+{report.mergedDuplicateIds.length} merged</span>
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[10px] font-semibold uppercase ${
                                report.domain === 'safety' ? 'text-red-600' : 'text-purple-700'
                              }`}
                            >
                              {report.domain}
                            </span>
                          </td>

                          {/* Title & Category */}
                          <td className="p-3 max-w-xs">
                            <div className="font-semibold text-slate-900 truncate">
                              <span className="truncate">{report.title}</span>
                            </div>
                            <div className="text-[11px] text-slate-600 flex items-center space-x-1.5 mt-0.5">
                              <span>{report.categoryName}</span>
                              <span>•</span>
                              <span className="flex items-center space-x-0.5 text-purple-700 font-semibold">
                                <ThumbsUp className="w-3 h-3" />
                                <span>{report.upvotesCount}</span>
                              </span>
                            </div>
                          </td>

                          {/* Location & Zone */}
                          <td className="p-3 max-w-[180px]">
                            <div className="text-slate-800 font-medium truncate">
                              {report.location.address}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {report.location.neighborhood}
                            </div>
                          </td>

                          {/* Severity */}
                          <td className="p-3">
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                report.severity === 'emergency'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : report.severity === 'high'
                                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {report.severity}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="p-3">
                            <span
                              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                                report.status === 'resolved'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : report.status === 'in_progress' || report.status === 'dispatched'
                                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                                  : 'bg-[#ede4d4] text-slate-800 border-[#ded1be]'
                              }`}
                            >
                              {report.status.replace('_', ' ')}
                            </span>
                          </td>

                          {/* Assigned Agency */}
                          <td className="p-3 text-[11px] max-w-[160px]">
                            <div className="text-slate-800 font-semibold truncate">
                              {report.assignedDepartment
                                ? report.assignedDepartment
                                    .replace('Department of ', '')
                                    .replace('Municipal ', '')
                                : 'Unassigned'}
                            </div>
                            {report.assignedUnit && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                Unit: {report.assignedUnit}
                              </div>
                            )}
                          </td>

                          {/* Row Action Buttons - Light Purple */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {report.webhookRouting && (
                                <button
                                  type="button"
                                  onClick={() => openWebhookInspector(report)}
                                  title="Inspect Webhook Dispatch"
                                  className="p-1 rounded-md text-purple-700 hover:bg-purple-100 transition-colors"
                                >
                                  <Server className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setMergePrimaryReport(report);
                                  setIsMergeModalOpen(true);
                                }}
                                title="Merge duplicate pins into this ticket"
                                className="p-1 rounded-md text-purple-700 hover:bg-purple-100 transition-colors"
                              >
                                <GitMerge className="w-4 h-4" />
                              </button>

                              {report.domain === 'civic' && !report.resolutionProof && (
                                <button
                                  type="button"
                                  onClick={() => openResolutionProofModal(report)}
                                  title="Upload resolution proof photo"
                                  className="p-1 rounded-md text-purple-700 hover:bg-purple-100 transition-colors"
                                >
                                  <Camera className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => onSelectReport(report)}
                                className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-200 font-semibold rounded-md transition-colors text-[11px]"
                              >
                                View
                              </button>

                              {report.imageUrl && (
                                <button
                                  type="button"
                                  id={`btn-admin-delete-image-${report.id}`}
                                  onClick={() => setPendingDeleteImageReport(report)}
                                  title="Authority Action: Delete AI/incident image"
                                  className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                >
                                  <ImageOff className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                id={`btn-admin-delete-row-${report.id}`}
                                onClick={() => setPendingDeleteReport(report)}
                                title={isAi ? "Authority Action: Permanently delete AI post" : "Authority Action: Permanently delete incident"}
                                className={
                                  isAi
                                    ? "px-2.5 py-1 bg-purple-100 hover:bg-red-600 text-purple-800 hover:text-white border border-purple-300 hover:border-red-600 font-semibold rounded-md transition-all text-[11px] flex items-center space-x-1 shadow-xs active:scale-95"
                                    : "px-2.5 py-1 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 font-semibold rounded-md transition-all text-[11px] flex items-center space-x-1 shadow-xs active:scale-95"
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{isAi ? 'Delete AI' : 'Delete'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* In-App Single Incident Delete Confirmation Modal */}
      {pendingDeleteReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3 text-red-600">
              <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  {isAiAutoReport(pendingDeleteReport) ? 'Permanently Delete AI Post?' : 'Permanently Delete Incident?'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ticket <strong className="font-mono text-slate-800">{pendingDeleteReport.ticketNumber}</strong>
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
              <div className="font-semibold text-slate-900 truncate">
                {pendingDeleteReport.title}
              </div>
              <div className="text-slate-500 text-[11px] truncate">
                Location: {pendingDeleteReport.location.address}
              </div>
              <div className="text-[11px] text-red-700 bg-red-50 p-2 rounded-md border border-red-200 mt-2">
                {isAiAutoReport(pendingDeleteReport)
                  ? '⚠️ This AI-reported post will be permanently purged from the cloud database and client caches. It will never reappear.'
                  : '⚠️ This authority action will permanently purge this incident record and all associated media from the database.'}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingDeleteReport(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-report-modal"
                onClick={() => {
                  const id = pendingDeleteReport.id;
                  deleteReport(id);
                  setPendingDeleteReport(null);
                  setSelectedReportIds((prev) => prev.filter((item) => item !== id));
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs transition-colors flex items-center space-x-1.5 shadow-xs active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Permanently Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Bulk Delete Confirmation Modal */}
      {pendingBulkDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3 text-red-600">
              <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete {selectedReportIds.length} Selected Tickets?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This will permanently remove all {selectedReportIds.length} selected incidents from the central system.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingBulkDelete(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-bulk-delete-modal"
                onClick={() => {
                  bulkDeleteReports(selectedReportIds);
                  setSelectedReportIds([]);
                  setPendingBulkDelete(false);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-xs transition-colors flex items-center space-x-1.5 shadow-xs active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete {selectedReportIds.length} Tickets</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Image Confirmation Modal */}
      {pendingDeleteImageReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3 text-amber-600">
              <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                <ImageOff className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Incident Image?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ticket <strong className="font-mono">{pendingDeleteImageReport.ticketNumber}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              This authority action will remove the AI/incident image attached to this ticket while retaining the rest of the report.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingDeleteImageReport(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-image-modal"
                onClick={() => {
                  deleteReportImage(pendingDeleteImageReport.id);
                  setPendingDeleteImageReport(null);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition-colors flex items-center space-x-1.5 shadow-xs active:scale-95"
              >
                <ImageOff className="w-4 h-4" />
                <span>Delete Image</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Merge Modal Mount */}
      <DuplicateMergeModal
        isOpen={isMergeModalOpen}
        onClose={() => {
          setIsMergeModalOpen(false);
          setMergePrimaryReport(null);
        }}
        primaryReport={mergePrimaryReport}
      />
    </div>
  );
};
