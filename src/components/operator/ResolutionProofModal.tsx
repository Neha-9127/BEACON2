import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { IncidentReport, ResolutionProof } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface ResolutionProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: IncidentReport | null;
  onConfirmResolution: (proof: ResolutionProof) => void;
}

const SAMPLE_FIX_PHOTOS: Record<string, { title: string; url: string; note: string }> = {
  potholes: {
    title: 'Hot-Mix Asphalt Compaction & Seal',
    url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156a?auto=format&fit=crop&w=800&q=80',
    note: 'Infrared thermal patch applied with 2.5-ton vibrating roller. Smooth grade verified with zero tire deflection.'
  },
  waste_management: {
    title: 'Site Cleared, Sanitized & Bin Replaced',
    url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80',
    note: 'Debris hauled to transfer station. Sidewalk power-washed and anti-dumping signage inspected.'
  },
  streetlights: {
    title: 'New High-Output LED Luminaire Installed',
    url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80',
    note: 'Replaced burnt photocell ballast and secured wiring junction box. Light output measured at 48 lux.'
  },
  water_leakage: {
    title: 'Underground Main Sleeved & Re-pressurized',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    note: 'Main line clamped with stainless steel repair sleeve. Backfill compacted and dry asphalt restored.'
  },
  default: {
    title: 'Public Works Standard Fix Completed',
    url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
    note: 'Repairs completed according to municipal code standards. Inspected and approved for sign-off.'
  }
};

export const ResolutionProofModal: React.FC<ResolutionProofModalProps> = ({
  isOpen,
  onClose,
  report,
  onConfirmResolution
}) => {
  const { currentUser } = useAuth();
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [technicianName, setTechnicianName] = useState<string>(
    currentUser.name || 'Lead Technician #4'
  );
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen || !report) return null;

  const sampleFix =
    SAMPLE_FIX_PHOTOS[report.categoryId] || SAMPLE_FIX_PHOTOS.default;

  const handleSelectSample = () => {
    setPhotoUrl(sampleFix.url);
    if (!notes) {
      setNotes(sampleFix.note);
    }
    setErrorMessage('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result as string);
      setErrorMessage('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl) {
      setErrorMessage('A verified photo proof of the completed fix is mandatory.');
      return;
    }
    if (!notes.trim()) {
      setErrorMessage('Please include a brief description of the repair work performed.');
      return;
    }

    onConfirmResolution({
      photoUrl,
      timestamp: new Date().toISOString(),
      technicianName: technicianName.trim() || 'Municipal Field Crew',
      notes: notes.trim(),
      exifVerified: true
    });
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="resolution-proof-modal"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-900"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">
                Public Works Verification Standard
              </span>
              <span className="text-sm font-bold text-white">
                Require Photo Proof Upon Fix
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Audit Rule Notice */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-900 flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px]">
              <strong className="font-semibold">Required Photo Verification:</strong> To close ticket{' '}
              <span className="font-mono font-bold">{report.ticketNumber}</span>, municipal code mandates timestamped photographic proof of the finished repair before notifying reporting citizens.
            </div>
          </div>

          {/* Before & After Preview Row */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Before: Original Damage */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                1. Before (Reported Issue)
              </span>
              <div className="aspect-video rounded-xl bg-slate-100 overflow-hidden border border-slate-200 relative">
                {report.imageUrl ? (
                  <img
                    src={report.imageUrl}
                    alt="Original reported issue"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">
                    No before photo
                  </div>
                )}
                <span className="absolute bottom-1 left-1 bg-slate-900/80 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                  ORIGINAL
                </span>
              </div>
            </div>

            {/* After: Fix Verification */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                2. After (Resolved Proof) *
              </span>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`aspect-video rounded-xl overflow-hidden border cursor-pointer relative flex flex-col items-center justify-center transition-colors ${
                  photoUrl
                    ? 'border-emerald-500 bg-slate-900'
                    : 'border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-500'
                }`}
              >
                {photoUrl ? (
                  <>
                    <img
                      src={photoUrl}
                      alt="Verified resolution fix"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1 bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                      VERIFIED FIX
                    </span>
                  </>
                ) : (
                  <div className="text-center p-2">
                    <Camera className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                    <span className="text-[10px] font-semibold text-slate-700 block">
                      Add Fix Photo
                    </span>
                    <span className="text-[9px] text-slate-500">Click to upload</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Quick Sample Selector */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium flex items-center space-x-1 transition-colors border border-slate-200"
            >
              <Upload className="w-3 h-3" />
              <span>Upload Custom Photo</span>
            </button>

            <button
              type="button"
              onClick={handleSelectSample}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Use Crew Proof Sample</span>
            </button>
          </div>

          {/* Technician Name & Signature */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 block">
              Repair Crew / Certifying Technician Name
            </label>
            <input
              type="text"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              placeholder="e.g. Lead Dispatcher / Crew Lead"
              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs text-xs"
            />
          </div>

          {/* Work Completion Notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 block">
              Work Order Completion Summary & Notes *
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe materials used, compaction verification, or testing performed..."
              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs text-xs"
            />
          </div>

          {errorMessage && (
            <div className="p-2.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl flex items-center space-x-1.5 text-[11px]">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="pt-2 flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors border border-slate-200 shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1.5 active:scale-95"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Certify & Mark Resolved</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
