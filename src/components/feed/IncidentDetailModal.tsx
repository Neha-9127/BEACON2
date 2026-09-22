import React, { useState } from 'react';
import {
  X,
  MapPin,
  ShieldCheck,
  Building2,
  ShieldAlert,
  Clock,
  Play,
  Pause,
  ThumbsUp,
  Lock,
  Send,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Server,
  Camera,
  Users,
  ExternalLink,
  Sparkles,
  Volume2,
  Zap,
  Film,
  Trash2,
  ImageOff
} from 'lucide-react';
import { IncidentReport, IncidentStatus, SeverityLevel, isAiAutoReport } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useIncidents } from '../../context/IncidentContext';
import {
  calculateDistanceKm,
  formatDistance,
  testSafetyAlertSiren,
  playEmergencyAlertBuzzer,
  resolveChennaiAuthorityRouting
} from '../../utils/geoRouting';

interface IncidentDetailModalProps {
  report: IncidentReport | null;
  onClose: () => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({ report, onClose }) => {
  const { currentRole, currentUser, isAuthority, openLoginModal } = useAuth();
  const {
    updateReportStatus,
    assignDepartment,
    toggleUpvote,
    openWebhookInspector,
    openResolutionProofModal,
    deleteReport,
    deleteReportImage
  } = useIncidents();

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [operatorNoteInput, setOperatorNoteInput] = useState(report?.operatorNotes || '');
  const [assignedUnitInput, setAssignedUnitInput] = useState(report?.assignedUnit || '');
  const [selectedStatus, setSelectedStatus] = useState<IncidentStatus>(report?.status || 'reported');
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [showConfirmDeleteTop, setShowConfirmDeleteTop] = useState(false);
  const [showConfirmDeleteImage, setShowConfirmDeleteImage] = useState(false);

  const isAi = isAiAutoReport(report);

  if (!report) return null;

  const userLat = currentUser?.anchorLocation?.lat && currentUser.anchorLocation.lat > 8 && currentUser.anchorLocation.lat < 36 ? currentUser.anchorLocation.lat : 13.0827;
  const userLng = currentUser?.anchorLocation?.lng && currentUser.anchorLocation.lng > 68 && currentUser.anchorLocation.lng < 98 ? currentUser.anchorLocation.lng : 80.2707;
  const distanceKm = calculateDistanceKm(
    userLat,
    userLng,
    report.location.lat,
    report.location.lng
  );

  const authorityRouting = report.authorityRouting || resolveChennaiAuthorityRouting(
    report.location.lat,
    report.location.lng,
    report.categoryId,
    report.categoryName,
    report.severity,
    report.domain
  );

  const hasUpvoted = report.upvoters?.includes(currentUser.id) || false;

  const handleAudioPlayToggle = () => {
    if (!report.audioNote) return;
    const audio = new Audio(report.audioNote.url);
    if (!isPlayingAudio) {
      setIsPlayingAudio(true);
      audio.play().catch(() => setIsPlayingAudio(false));
      audio.onended = () => setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(false);
    }
  };

  const handleSaveOperatorActions = () => {
    // If setting to resolved and civic issue without proof, enforce resolution proof modal
    if (selectedStatus === 'resolved' && report.domain === 'civic' && !report.resolutionProof) {
      openResolutionProofModal(report);
      return;
    }
    const result = updateReportStatus(report.id, selectedStatus, operatorNoteInput, assignedUnitInput);
    if (result.success && selectedStatus === 'resolved') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="incident-detail-modal"
        className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-200 text-slate-900 overflow-hidden my-auto max-h-[90vh] flex flex-col"
      >
        {/* Modal Top Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span
              className={`p-1.5 rounded-lg ${
                report.domain === 'safety' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
              }`}
            >
              {report.domain === 'safety' ? (
                <ShieldAlert className="w-4 h-4" />
              ) : (
                <Building2 className="w-4 h-4" />
              )}
            </span>
            <div>
              <span className="text-[10px] font-mono text-slate-400 block uppercase font-semibold">
                {report.domain.toUpperCase()} ROUTING DISPATCH
              </span>
              <span className="text-sm font-bold text-white tracking-tight">
                {report.ticketNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isAi && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-900/70 text-purple-200 border border-purple-400/60 flex items-center space-x-1 shadow-xs">
                <Sparkles className="w-3 h-3 text-purple-300" />
                <span>AI Reported</span>
              </span>
            )}
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                report.severity === 'emergency'
                  ? 'bg-red-600 text-white'
                  : report.severity === 'high'
                  ? 'bg-orange-500 text-white'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              {report.severity}
            </span>

            {/* Top Delete Button on incident detail header */}
            {isAuthority && (
              showConfirmDeleteTop ? (
                <div className="flex items-center space-x-1.5 bg-red-950/95 border border-red-500/80 px-2 py-0.5 rounded-lg animate-in fade-in">
                  <span className="text-[11px] font-semibold text-red-200">
                    {isAi ? 'Delete AI post?' : 'Delete ticket?'}
                  </span>
                  <button
                    type="button"
                    id={isAi ? "btn-detail-confirm-delete-ai-top" : "btn-detail-confirm-delete-top"}
                    onClick={() => {
                      deleteReport(report.id);
                      onClose();
                    }}
                    className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded shadow-xs active:scale-95"
                  >
                    {isAi ? 'Delete Forever' : 'Yes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDeleteTop(false)}
                    className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id={isAi ? "btn-detail-delete-ai-top" : "btn-detail-delete-top"}
                  onClick={() => setShowConfirmDeleteTop(true)}
                  className={
                    isAi
                      ? "px-2.5 py-1 bg-purple-900/60 hover:bg-red-600 text-purple-200 hover:text-white border border-purple-400/60 hover:border-red-600 font-semibold rounded-lg transition-all flex items-center space-x-1 text-xs shadow-xs active:scale-95"
                      : "px-2.5 py-1 bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white border border-red-500/50 hover:border-red-600 font-semibold rounded-lg transition-all flex items-center space-x-1 text-xs shadow-xs active:scale-95"
                  }
                  title={isAi ? "Permanently delete this AI reported post (Authority clearance)" : "Permanently delete this incident report from the system (Authority clearance)"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isAi ? 'Delete AI' : 'Delete'}</span>
                </button>
              )
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Main Title & Description */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <span>
                {report.categoryName} • {report.subcategory}
              </span>
              <span className="text-emerald-700 font-mono font-medium lowercase">
                📍 {formatDistance(distanceKm)} away
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {report.title}
            </h2>
            <p className="text-xs text-slate-700 mt-2 leading-relaxed whitespace-pre-wrap">
              {report.description}
            </p>
          </div>

          {/* Emergency Alert Banner with Siren and Buzzer */}
          {report.severity === 'emergency' && (
            <div className="bg-red-50 border border-red-300/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center flex-shrink-0 font-bold animate-pulse">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-red-950 flex items-center space-x-1.5">
                    <span>Critical Emergency Incident</span>
                    <span className="text-[10px] font-mono bg-red-200 text-red-900 px-1.5 py-0.2 rounded font-bold">
                      IMMEDIATE DISPATCH
                    </span>
                  </div>
                  <div className="text-[11px] text-red-800">
                    Broadcasted instantly to authorities and local citizens within the alert radius.
                  </div>
                </div>
              </div>

              {/* Siren and Buzzer Buttons */}
              <div className="flex items-center space-x-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => playEmergencyAlertBuzzer()}
                  className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-md active:scale-95 animate-pulse"
                  title="Ring Industrial Emergency Buzzer"
                >
                  <span>Ring Buzzer</span>
                </button>
                <button
                  type="button"
                  onClick={() => testSafetyAlertSiren()}
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs active:scale-95"
                  title="Test emergency siren"
                >
                  <span>Siren</span>
                </button>
              </div>
            </div>
          )}

          {/* Civic Automated Webhook Badge Banner */}
          {report.webhookRouting && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-950 flex items-center space-x-1.5">
                    <span>Municipal Automated Dispatch Active</span>
                    <span className="text-[10px] font-mono bg-blue-200 text-blue-900 px-1.5 py-0.2 rounded">
                      HTTP 202 ACCEPTED
                    </span>
                  </div>
                  <div className="text-[11px] text-blue-700">
                    Queue: <strong>{report.webhookRouting.targetDepartment}</strong> • Zone: {report.webhookRouting.municipalZone}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openWebhookInspector(report)}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center space-x-1 flex-shrink-0 shadow-xs"
              >
                <span>Inspect Webhook</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Media & Automated EXIF Metadata */}
          {report.resolutionProof ? (
            /* Before & After Photo Verification comparison view */
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Dual-Photo Fix Verification Certified</span>
                </span>
                <span className="text-[11px] text-emerald-800 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Verified by {report.resolutionProof.technicianName}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Before */}
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                  <div className="relative aspect-video max-h-48 flex items-center justify-center bg-slate-950">
                    <img
                      src={report.imageUrl}
                      alt="Incident before fix"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-2 left-2 bg-slate-950/80 text-white px-2 py-0.5 rounded text-[10px] font-mono">
                      BEFORE: Citizen Submission
                    </span>
                  </div>
                </div>

                {/* After */}
                <div className="rounded-xl overflow-hidden border-2 border-emerald-500 bg-slate-900">
                  <div className="relative aspect-video max-h-48 flex items-center justify-center bg-slate-950">
                    <img
                      src={report.resolutionProof.photoUrl}
                      alt="Incident after resolution"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-2 left-2 bg-emerald-700 text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>AFTER: Certified Fix Proof</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 space-y-1">
                <div className="font-semibold flex items-center justify-between">
                  <span>Certified Technician: {report.resolutionProof.technicianName}</span>
                  <span className="font-mono text-[11px] text-emerald-700">
                    {new Date(report.resolutionProof.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-emerald-800">{report.resolutionProof.notes}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Incident Video Evidence Player (Featured when present) */}
              {report.videoUrl && (
                <div className="rounded-xl overflow-hidden border border-red-300 bg-slate-950 shadow-xs">
                  <div className="p-2.5 bg-red-950/90 text-red-200 text-xs font-semibold flex items-center justify-between border-b border-red-800">
                    <span className="flex items-center space-x-1.5">
                      <Film className="w-4 h-4 text-red-400" />
                      <span>Instant Incident Video Footage</span>
                    </span>
                    <span className="font-mono text-[10px] bg-red-900/80 text-white px-2 py-0.5 rounded border border-red-700 font-semibold">
                      {report.videoDurationSeconds ? `${report.videoDurationSeconds}s RECORDED` : 'ACTIVE VIDEO EVIDENCE'}
                    </span>
                  </div>
                  <video
                    src={report.videoUrl}
                    controls
                    playsInline
                    className="w-full aspect-video max-h-80 object-cover bg-black"
                  />
                </div>
              )}

              {/* Photo Evidence / Extracted Poster */}
              {report.imageUrl ? (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950 relative group">
                  <div className="relative aspect-video max-h-72 flex items-center justify-center bg-slate-950">
                    <img
                      src={report.imageUrl}
                      alt={report.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />

                    {/* AI Detection Evidence Badge */}
                    {isAi && (
                      <div className="absolute top-2.5 left-2.5 bg-purple-950/90 text-purple-200 border border-purple-400/80 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 backdrop-blur-xs shadow-xs">
                        <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                        <span>AI Detection Evidence</span>
                      </div>
                    )}

                    {/* Remove Photo Only Button (keeps ticket) - Accessible only to logged-in authorities */}
                    {isAuthority && (
                      <div className="absolute top-2.5 right-2.5 z-10">
                        {showConfirmDeleteImage ? (
                          <div className="bg-slate-950/95 backdrop-blur-md p-2 rounded-xl border border-amber-500 shadow-xl flex items-center space-x-2 animate-in fade-in zoom-in-95">
                            <span className="text-[11px] font-semibold text-amber-300">Remove Photo?</span>
                            <button
                              type="button"
                              id="btn-confirm-delete-image-detail"
                              onClick={() => {
                                deleteReportImage(report.id);
                                setShowConfirmDeleteImage(false);
                              }}
                              className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold rounded-md shadow-xs active:scale-95"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowConfirmDeleteImage(false)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-md"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            id="btn-delete-incident-image"
                            onClick={() => setShowConfirmDeleteImage(true)}
                            className="px-3 py-1.5 bg-slate-900/80 hover:bg-amber-600 text-slate-200 hover:text-white text-xs font-semibold rounded-lg shadow-md flex items-center space-x-1.5 transition-colors border border-slate-700 hover:border-amber-500 active:scale-95 backdrop-blur-xs"
                            title="Remove photo only (Authority clearance)"
                          >
                            <ImageOff className="w-3.5 h-3.5" />
                            <span>Remove Photo Only</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* EXIF Metadata Bar */}
                  {report.exifData && (
                    <div className="p-3 bg-slate-900 text-slate-300 text-xs border-t border-slate-800 space-y-1">
                      <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold mb-1">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Automated EXIF Metadata Verified</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-400">
                        <div>
                          <span className="text-slate-500 block">Device:</span>
                          {report.exifData.deviceModel}
                        </div>
                        <div>
                          <span className="text-slate-500 block">ISO:</span>
                          ISO-{report.exifData.iso} • {report.exifData.shutterSpeed}
                        </div>
                        <div>
                          <span className="text-slate-500 block">Timestamp:</span>
                          {new Date(report.exifData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div>
                          <span className="text-slate-500 block">GPS Sync:</span>
                          {report.exifData.originalGps.lat.toFixed(4)}°, {report.exifData.originalGps.lng.toFixed(4)}°
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : !report.videoUrl ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
                  <ImageOff className="w-4 h-4 text-slate-400" />
                  <span>No media attached (or deleted by authority)</span>
                </div>
              ) : null}
            </>
          )}

          {/* Audio Note Player */}
          {report.audioNote && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleAudioPlayToggle}
                  className="w-9 h-9 rounded-full bg-slate-900 hover:bg-blue-600 text-white flex items-center justify-center shadow-xs transition-colors"
                >
                  {isPlayingAudio ? (
                    <Pause className="w-4 h-4 text-amber-300 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 text-emerald-400 fill-current ml-0.5" />
                  )}
                </button>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Attached Audio Field Note
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Duration: {report.audioNote.durationSeconds} seconds • Original Audio Stream
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Location & Proximity Indicators */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-slate-900 text-xs font-bold">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>{report.location.address}</span>
              </div>
              <span className="text-emerald-700 font-mono font-medium">
                {formatDistance(distanceKm)} away
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Coordinates: {report.location.lat}° N, {report.location.lng}° W • Neighborhood: {report.location.neighborhood}
            </div>
            {report.location.proximityZone && (
              <div className="inline-block text-[11px] bg-blue-100 text-blue-900 font-medium px-2 py-0.5 rounded">
                Proximity Indicator: {report.location.proximityZone.replace('_', ' ').toUpperCase()}
              </div>
            )}
          </div>

          {/* Privacy & Reporting Citizen Status */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div className="font-semibold text-slate-800">Privacy & Reporting Party</div>
            {report.isAnonymous ? (
              <div className="flex items-center space-x-1.5 text-emerald-800 font-medium">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Anonymity Shield Active: Citizen personal identifiers masked.</span>
              </div>
            ) : (
              <div className="text-slate-700">
                Verified Citizen: <strong className="text-slate-900">{report.reporterName}</strong>
                {report.reporterPhoneMasked && ` (${report.reporterPhoneMasked})`}
              </div>
            )}
          </div>

          {/* Automated Authority Notification Routing (Chennai Region) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-slate-100 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Automated Authority Notification Routing (Chennai Region)
                </span>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-700 font-semibold">
                SPATIAL PROXIMITY ENGINE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {/* Municipal Corporation Zonal Office */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-400 flex items-center space-x-1">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Greater Chennai Corporation</span>
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                    {formatDistance(authorityRouting.nearestMunicipalOffice.distanceKm)}
                  </span>
                </div>
                <div className="font-semibold text-white text-[12px] leading-snug">
                  {authorityRouting.nearestMunicipalOffice.name}
                </div>
                <div className="text-[11px] text-slate-400">
                  {authorityRouting.nearestMunicipalOffice.zone}
                </div>
                <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800 flex items-center justify-between">
                  <span>Officer: {authorityRouting.nearestMunicipalOffice.contactOfficer}</span>
                  <span className="text-emerald-400 uppercase font-semibold">NOTIFIED & DISPATCHED</span>
                </div>
                <div className="text-[10px] text-slate-400 italic">
                  {authorityRouting.nearestMunicipalOffice.routingReason}
                </div>
              </div>

              {/* Greater Chennai Police Station */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-blue-400 flex items-center space-x-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                    <span>Greater Chennai Police ({authorityRouting.nearestPoliceStation.stationCode})</span>
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-blue-300 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800">
                    {formatDistance(authorityRouting.nearestPoliceStation.distanceKm)}
                  </span>
                </div>
                <div className="font-semibold text-white text-[12px] leading-snug">
                  {authorityRouting.nearestPoliceStation.name}
                </div>
                <div className="text-[11px] text-slate-400">
                  {authorityRouting.nearestPoliceStation.division}
                </div>
                <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800 flex items-center justify-between">
                  <span>SHO: {authorityRouting.nearestPoliceStation.shoOfficer}</span>
                  <span className="text-blue-400 uppercase font-semibold">NOTIFIED & DISPATCHED</span>
                </div>
                <div className="text-[10px] text-slate-400 italic">
                  {authorityRouting.nearestPoliceStation.routingReason}
                </div>
              </div>
            </div>
          </div>

          {/* Operational Action Center - Strictly for Authorities Logged in via Authority Login */}
          {isAuthority ? (
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>
                    {currentRole === 'operator'
                      ? 'Municipal Works Dispatch Operations'
                      : currentRole === 'safety'
                      ? 'Safety Authority Emergency Response Command'
                      : 'Admin Operational Command Console'}
                  </span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                  AUTHORITY CLEARANCE ACTIVE
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Workflow Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as IncidentStatus)}
                    className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="reported">Reported (Pending Triage)</option>
                    <option value="acknowledged">Acknowledged by Dispatch</option>
                    <option value="in_progress">In Progress</option>
                    <option value="dispatched">Unit Dispatched to Scene</option>
                    <option value="resolved">Resolved & Closed (Requires Photo Proof)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Assigned Response Unit / Crew
                  </label>
                  <input
                    type="text"
                    value={assignedUnitInput}
                    onChange={(e) => setAssignedUnitInput(e.target.value)}
                    placeholder={
                      currentRole === 'safety'
                        ? 'e.g. Patrol Unit 4 / Fire Squad 12'
                        : 'e.g. Asphalt Crew #2 / Lighting Truck 7'
                    }
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Internal Operator Notes & Action Logs
                  </label>
                  <textarea
                    rows={2}
                    value={operatorNoteInput}
                    onChange={(e) => setOperatorNoteInput(e.target.value)}
                    placeholder="Log dispatch actions, contractor coordination, or scene safety notes..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                {/* Photo Verification Trigger for Operators */}
                {report.domain === 'civic' && !report.resolutionProof && (
                  <button
                    type="button"
                    onClick={() => openResolutionProofModal(report)}
                    className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <Camera className="w-4 h-4 text-emerald-700" />
                    <span>Attach Resolution Photo Proof</span>
                  </button>
                )}

                <button
                  type="button"
                  id="btn-save-operator-actions"
                  onClick={handleSaveOperatorActions}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Save Dispatch Update</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 text-slate-700">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Live Workflow Milestone</span>
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-mono">
                  {report.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                <strong className="text-slate-900">Authority Operational Control:</strong> All changes—including updating workflow status, dispatching crews, adding internal notes, deleting AI images, and deleting reported tickets—can only be done by authorized personnel who are logged in using <strong>Authority Login</strong>.
              </p>
              <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 italic">Are you an authorized officer or municipal engineer?</span>
                <button
                  type="button"
                  onClick={() => openLoginModal('authority')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 shadow-xs active:scale-95"
                >
                  <Lock className="w-3.5 h-3.5 text-white" />
                  <span>Authority Sign-In</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center space-x-2">
            {/* "I see this too" / Corroboration button */}
            <button
              type="button"
              id="btn-detail-upvote"
              onClick={() => toggleUpvote(report.id, currentUser.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-2 transition-all active:scale-95 text-xs ${
                hasUpvoted
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-xs'
              }`}
              title="Crowdsource validation prevents duplicates and bumps priority in dispatch queues"
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${hasUpvoted ? 'text-white fill-white' : 'text-blue-600'}`} />
              <span>{hasUpvoted ? 'You Validated This (+1)' : 'I See This Too (+1)'}</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[11px] font-mono font-bold ${
                  hasUpvoted ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {report.upvotesCount}
              </span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Delete ticket button - accessible only to logged-in authorities */}
            {isAuthority && (
              showConfirmDeleteModal ? (
                <div className="flex items-center space-x-1.5 bg-red-950 border border-red-500 px-2.5 py-1 rounded-lg animate-in fade-in zoom-in-95">
                  <span className="text-xs font-semibold text-red-200">
                    {isAi ? 'Permanently delete this AI post?' : 'Delete ticket permanently?'}
                  </span>
                  <button
                    type="button"
                    id={isAi ? "btn-detail-confirm-delete-ai" : "btn-detail-confirm-delete"}
                    onClick={() => {
                      deleteReport(report.id);
                      onClose();
                    }}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-md shadow-xs active:scale-95"
                  >
                    {isAi ? 'Yes, Delete Forever' : 'Yes, Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDeleteModal(false)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-md"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id={isAi ? "btn-detail-delete-ai" : "btn-detail-delete"}
                  onClick={() => setShowConfirmDeleteModal(true)}
                  className={
                    isAi
                      ? "px-3 py-1.5 bg-purple-950/80 hover:bg-red-600 text-purple-200 hover:text-white border border-purple-500 hover:border-red-500 font-semibold rounded-lg transition-all flex items-center space-x-1.5 active:scale-95 text-xs shadow-xs"
                      : "px-3 py-1.5 bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 font-semibold rounded-lg transition-all flex items-center space-x-1.5 active:scale-95 text-xs shadow-xs"
                  }
                  title={isAi ? "Permanently delete AI reported post (Authority clearance)" : "Permanently delete incident from database (Authority clearance)"}
                >
                  <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{isAi ? 'Delete AI Post' : 'Delete Incident'}</span>
                </button>
              )
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-300 transition-all text-xs active:scale-95 shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
