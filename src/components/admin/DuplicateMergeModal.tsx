import React, { useState } from 'react';
import {
  X,
  GitMerge,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ThumbsUp,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  ShieldAlert
} from 'lucide-react';
import { IncidentReport } from '../../types';
import { useIncidents } from '../../context/IncidentContext';
import { calculateDistanceKm, formatDistance } from '../../utils/geoRouting';

interface DuplicateMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryReport: IncidentReport | null;
}

export const DuplicateMergeModal: React.FC<DuplicateMergeModalProps> = ({
  isOpen,
  onClose,
  primaryReport
}) => {
  const { reports, mergeDuplicateReports } = useIncidents();
  const [selectedDuplicateIds, setSelectedDuplicateIds] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !primaryReport) return null;

  // Find candidate duplicates: same domain or same category, or close proximity (< 1.5 km), not already merged
  const candidateDuplicates = reports.filter(
    (r) =>
      r.id !== primaryReport.id &&
      !r.mergedIntoTicketId &&
      (r.categoryId === primaryReport.categoryId ||
        r.domain === primaryReport.domain ||
        calculateDistanceKm(
          primaryReport.location.lat,
          primaryReport.location.lng,
          r.location.lat,
          r.location.lng
        ) < 2.5)
  );

  const toggleSelectCandidate = (id: string) => {
    if (selectedDuplicateIds.includes(id)) {
      setSelectedDuplicateIds(selectedDuplicateIds.filter((item) => item !== id));
    } else {
      setSelectedDuplicateIds([...selectedDuplicateIds, id]);
    }
  };

  const handleMergeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDuplicateIds.length === 0) return;

    const res = mergeDuplicateReports(primaryReport.id, selectedDuplicateIds);
    if (res.success) {
      setSuccessMessage(res.message);
      setTimeout(() => {
        setSuccessMessage(null);
        setSelectedDuplicateIds([]);
        onClose();
      }, 1800);
    }
  };

  const selectedDuplicates = reports.filter((r) => selectedDuplicateIds.includes(r.id));
  const totalMergedUpvotes =
    primaryReport.upvotesCount +
    selectedDuplicates.reduce((sum, d) => sum + (d.upvotesCount || 1), 0);

  return (
    <div className="fixed inset-0 z-[1150] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="duplicate-merge-modal"
        className="relative w-full max-w-xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col text-slate-900"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <GitMerge className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-300 block font-semibold">
                ADMIN TRIAGE WORKFLOW
              </span>
              <h3 className="text-sm font-bold text-white">
                Combine Duplicate Incident Pins
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleMergeSubmit} className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Primary Incident Card */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-indigo-900 uppercase tracking-wider flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <span>PRIMARY ANCHOR TICKET</span>
              </span>
              <span className="font-mono font-bold text-indigo-700">
                {primaryReport.ticketNumber}
              </span>
            </div>
            <h4 className="font-bold text-slate-900 text-sm">{primaryReport.title}</h4>
            <div className="flex items-center space-x-2 text-slate-600 text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{primaryReport.location.address}</span>
              <span>•</span>
              <span className="font-semibold text-slate-700">{primaryReport.categoryName}</span>
            </div>
          </div>

          {/* Duplicates Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
                Select Duplicate Reports to Consolidate ({selectedDuplicateIds.length} selected)
              </label>
              <span className="text-[11px] text-slate-500">
                {candidateDuplicates.length} nearby candidate(s)
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
              {candidateDuplicates.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">
                  No nearby duplicate candidates found within proximity bounds.
                </div>
              ) : (
                candidateDuplicates.map((dup) => {
                  const isSelected = selectedDuplicateIds.includes(dup.id);
                  const dist = calculateDistanceKm(
                    primaryReport.location.lat,
                    primaryReport.location.lng,
                    dup.location.lat,
                    dup.location.lng
                  );

                  return (
                    <div
                      key={dup.id}
                      onClick={() => toggleSelectCandidate(dup.id)}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-start space-x-3 ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-300 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="mt-1 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-semibold text-slate-700">
                            {dup.ticketNumber}
                          </span>
                          <span className="text-emerald-700 font-mono text-[10px]">
                            {formatDistance(dist)} away
                          </span>
                        </div>
                        <div className="font-semibold text-slate-900 truncate">
                          {dup.title}
                        </div>
                        <div className="text-slate-500 text-[11px] flex items-center space-x-2 mt-0.5">
                          <span>{dup.categoryName}</span>
                          <span>•</span>
                          <span className="flex items-center space-x-0.5 text-blue-600 font-semibold">
                            <ThumbsUp className="w-3 h-3" />
                            <span>{dup.upvotesCount}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Merge Impact Preview */}
          {selectedDuplicateIds.length > 0 && (
            <div className="bg-slate-900 text-white p-3 rounded-xl space-y-1.5 text-xs">
              <div className="font-semibold text-indigo-300 flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Consolidation Impact Preview</span>
              </div>
              <div className="text-[11px] text-slate-300">
                • Merging <strong>{selectedDuplicateIds.length}</strong> duplicate tickets into {primaryReport.ticketNumber}.
                <br />
                • Citizen corroboration validation bumps to <strong>{totalMergedUpvotes} total points</strong>.
                <br />
                • Duplicate pins will be flagged as resolved and route directly to this dispatch work order.
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedDuplicateIds.length === 0}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center space-x-1.5 text-xs"
            >
              <GitMerge className="w-4 h-4" />
              <span>Merge & Combine Selected</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
