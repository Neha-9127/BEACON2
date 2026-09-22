import React, { useState } from 'react';
import {
  MapPin,
  Clock,
  ShieldCheck,
  Volume2,
  ThumbsUp,
  Lock,
  ChevronRight,
  Building2,
  ShieldAlert,
  Play,
  Pause,
  Server,
  CheckCircle2,
  Users,
  Film,
  Trash2,
  ImageOff,
  Sparkles
} from 'lucide-react';
import { IncidentReport, isAiAutoReport } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useIncidents } from '../../context/IncidentContext';
import { calculateDistanceKm, formatDistance } from '../../utils/geoRouting';

interface IncidentCardProps {
  report: IncidentReport;
  onOpenDetail: (report: IncidentReport) => void;
}

export const IncidentCard: React.FC<IncidentCardProps> = ({ report, onOpenDetail }) => {
  const { currentRole, currentUser, isAuthority } = useAuth();
  const { toggleUpvote, openWebhookInspector, deleteReport, deleteReportImage } = useIncidents();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPlayingInlineVideo, setIsPlayingInlineVideo] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteTop, setConfirmDeleteTop] = useState(false);
  const [confirmDeleteImg, setConfirmDeleteImg] = useState(false);

  const isAi = isAiAutoReport(report);

  // Compute distance from citizen/user anchor location (Chennai region default)
  const userLat = currentUser?.anchorLocation?.lat && currentUser.anchorLocation.lat > 8 && currentUser.anchorLocation.lat < 36 ? currentUser.anchorLocation.lat : 13.0827;
  const userLng = currentUser?.anchorLocation?.lng && currentUser.anchorLocation.lng > 68 && currentUser.anchorLocation.lng < 98 ? currentUser.anchorLocation.lng : 80.2707;
  const distanceKm = calculateDistanceKm(
    userLat,
    userLng,
    report.location.lat,
    report.location.lng
  );

  const hasUpvoted = report.upvoters?.includes(currentUser.id) || false;

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'emergency':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'dispatched':
      case 'in_progress':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'acknowledged':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const playAudioNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!report.audioNote) return;

    const audio = new Audio(report.audioNote.url);
    setIsPlayingAudio(true);
    audio.play().catch(() => setIsPlayingAudio(false));
    audio.onended = () => setIsPlayingAudio(false);
  };

  const handleUpvoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleUpvote(report.id, currentUser.id);
  };

  return (
    <div
      id={`incident-card-${report.id}`}
      onClick={() => onOpenDetail(report)}
      className="bg-[#fbf9f4] rounded-xl border border-[#ded1be] shadow-xs hover:border-[#c9baa2] hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer flex flex-col justify-between text-slate-900"
    >
      <div>
        {/* Card Header Bar */}
        <div className="p-3.5 pb-2 flex items-center justify-between border-b border-[#ded1be] bg-[#f4ebe0]">
          <div className="flex items-center space-x-2">
            <span
              className={`w-6 h-6 rounded-md flex items-center justify-center text-xs ${
                report.domain === 'safety' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-purple-100 text-purple-700 border border-purple-200'
              }`}
            >
              {report.domain === 'safety' ? (
                <ShieldAlert className="w-3.5 h-3.5" />
              ) : (
                <Building2 className="w-3.5 h-3.5" />
              )}
            </span>
            <span className="font-mono text-xs font-bold text-slate-800 tracking-tight">
              {report.ticketNumber}
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            {isAi && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center space-x-1">
                <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                <span>AI Reported</span>
              </span>
            )}
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getSeverityStyle(
                report.severity
              )}`}
            >
              {report.severity}
            </span>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusStyle(
                report.status
              )}`}
            >
              {report.status.replace('_', ' ')}
            </span>

            {/* Top Delete Button on reported incident - permanent deletion (Only accessible to logged-in authorities) */}
            {isAuthority && (
              confirmDeleteTop ? (
                <div
                  className="flex items-center space-x-1 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md text-[10px] animate-in fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="font-semibold text-red-700">{isAi ? 'Delete AI post?' : 'Delete?'}</span>
                  <button
                    type="button"
                    id={`btn-confirm-delete-top-${report.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteReport(report.id);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold px-1.5 py-0.5 rounded text-[10px] transition-colors"
                  >
                    {isAi ? 'Delete' : 'Yes'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteTop(false);
                    }}
                    className="text-slate-600 hover:text-slate-900 px-1 text-[10px]"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id={isAi ? `btn-delete-ai-card-top-${report.id}` : `btn-delete-card-top-${report.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteTop(true);
                  }}
                  className={
                    isAi
                      ? 'px-2 py-0.5 rounded-md bg-purple-100 hover:bg-red-600 text-purple-800 hover:text-white border border-purple-300 hover:border-red-600 text-[10px] font-semibold flex items-center space-x-1 transition-all active:scale-95 shadow-2xs'
                      : 'px-2 py-0.5 rounded-md bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 text-[10px] font-semibold flex items-center space-x-1 transition-all active:scale-95 shadow-2xs'
                  }
                  title={isAi ? 'Permanently delete this AI reported post' : 'Delete this report'}
                  aria-label={isAi ? `Delete AI report ${report.ticketNumber}` : `Delete report ${report.ticketNumber}`}
                >
                  <Trash2 className="w-3 h-3 flex-shrink-0" />
                  <span>{isAi ? 'Delete AI' : 'Delete'}</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Media Thumbnail: Before & After if resolved with photo proof */}
        {report.resolutionProof ? (
          <div className="relative aspect-video max-h-44 bg-slate-900 overflow-hidden grid grid-cols-2 gap-0.5">
            <div className="relative h-full overflow-hidden">
              <img
                src={report.imageUrl}
                alt="Before fix"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1.5 left-1.5 bg-black/75 text-white px-1.5 py-0.5 rounded text-[9px] font-mono">
                BEFORE
              </span>
            </div>
            <div className="relative h-full overflow-hidden border-l border-white/20">
              <img
                src={report.resolutionProof.photoUrl}
                alt="After fix"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1.5 left-1.5 bg-emerald-700 text-white px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>FIX VERIFIED</span>
              </span>
            </div>
          </div>
        ) : (report.imageUrl || report.videoUrl) ? (
          <div className="relative aspect-video max-h-44 bg-slate-100 overflow-hidden">
            {report.videoUrl && isPlayingInlineVideo ? (
              <video
                src={report.videoUrl}
                autoPlay
                controls
                playsInline
                className="w-full h-full object-cover"
                onClick={(e) => e.stopPropagation()}
              />
            ) : report.imageUrl ? (
              <img
                src={report.imageUrl}
                alt={report.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : report.videoUrl ? (
              <video
                src={report.videoUrl}
                preload="metadata"
                playsInline
                className="w-full h-full object-cover"
              />
            ) : null}

            {/* If video is attached and not playing inline yet, show prominent play overlay */}
            {report.videoUrl && !isPlayingInlineVideo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlayingInlineVideo(true);
                }}
                className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 z-10"
                title="Play Video Evidence"
              >
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </button>
            )}

            {isAi && (
              <div className="absolute top-2 left-2 bg-purple-900/90 text-white border border-purple-400 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center space-x-1 backdrop-blur-xs shadow-xs z-10">
                <Sparkles className="w-3 h-3 text-purple-300" />
                <span>AI Automated Report</span>
              </div>
            )}
            {report.exifData && (
              <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[10px] font-mono flex items-center space-x-1 z-10">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>EXIF Verified ({report.exifData.deviceModel.split(' ')[0]})</span>
              </div>
            )}
            {report.videoUrl && (
              <div className="absolute bottom-2 right-2 bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 shadow-xs backdrop-blur-xs z-10">
                <Film className="w-3 h-3" />
                <span>Video {report.videoDurationSeconds ? `(${report.videoDurationSeconds}s)` : ''}</span>
              </div>
            )}
            {report.audioNote && (
              <button
                type="button"
                onClick={playAudioNote}
                className="absolute top-2 right-2 bg-slate-900/85 hover:bg-black text-white px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center space-x-1 shadow-xs transition-colors backdrop-blur-xs z-10"
              >
                {isPlayingAudio ? (
                  <Pause className="w-3 h-3 fill-current text-amber-400" />
                ) : (
                  <Play className="w-3 h-3 fill-current text-emerald-400" />
                )}
                <span>Voice Note ({report.audioNote.durationSeconds}s)</span>
              </button>
            )}
          </div>
        ) : null}

        {/* Content Body */}
        <div className="p-3.5 space-y-2">
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
              <span>{report.categoryName}</span>
              <span className="text-blue-600 font-mono font-medium lowercase">
                📍 {formatDistance(distanceKm)}
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
              {report.title}
            </h4>
          </div>

          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {report.description}
          </p>

          {/* Location details */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-600 pt-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate font-medium">{report.location.address}</span>
            {report.location.proximityZone && report.location.proximityZone !== 'general' && (
              <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                {report.location.proximityZone.replace('_', ' ')}
              </span>
            )}
          </div>

          {/* Civic Automated Routing Webhook Tag or Upvote Corroboration */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {report.isHotspot && (
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-red-600 text-white text-[10px] font-bold tracking-wide shadow-xs w-full justify-center">
                <span>HOTSPOT TICKET • {report.clusterMergedCount || ((report.mergedDuplicateIds?.length || 0) + 1)} REPORTS MERGED • PRIORITY: EMERGENCY</span>
              </div>
            )}

            {report.authorityRouting && (
              <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-slate-800 font-semibold truncate max-w-[120px]">
                  {report.authorityRouting.nearestMunicipalOffice.zone.split(' - ')[0]}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-blue-700 font-semibold">
                  {report.authorityRouting.nearestPoliceStation.stationCode}
                </span>
              </div>
            )}

            {report.webhookRouting && !report.authorityRouting && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openWebhookInspector(report);
                }}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[10px] font-medium transition-colors"
                title="Click to inspect automated webhook routing"
              >
                <Server className="w-3 h-3 text-blue-600" />
                <span>Routed &rarr; {report.assignedDepartment?.split(' ')[0] || 'Dept'}</span>
              </button>
            )}

            {report.upvotesCount >= 5 && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold">
                <Users className="w-3 h-3 text-amber-600" />
                <span>{report.upvotesCount} Corroborated</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer Details: Upvote / Validation Button */}
      <div className="p-3.5 pt-2 bg-[#f4ebe0] border-t border-[#ded1be] flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 text-slate-600">
          {report.isAnonymous ? (
            <div className="flex items-center space-x-1 text-emerald-700 font-medium text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>Identity Masked</span>
            </div>
          ) : (
            <span className="text-slate-700 font-medium truncate max-w-[130px]">
              {report.reporterName}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Delete Image Action - Accessible only to logged-in authorities */}
          {isAuthority && report.imageUrl && (
            confirmDeleteImg ? (
              <div
                className="flex items-center space-x-1 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md text-[10px]"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-semibold text-amber-800">Del img?</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteReportImage(report.id);
                    setConfirmDeleteImg(false);
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-1.5 py-0.5 rounded text-[10px]"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteImg(false);
                  }}
                  className="text-slate-500 hover:text-slate-800 px-1 text-[10px]"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                id={`btn-delete-img-${report.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDeleteImg(true);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors"
                title="Remove photo only (Authority clearance)"
                aria-label={`Remove photo only for report ${report.ticketNumber}`}
              >
                <ImageOff className="w-3.5 h-3.5" />
              </button>
            )
          )}

          {/* Delete Incident Action - Accessible only to logged-in authorities */}
          {isAuthority && (
            confirmDelete ? (
              <div
                className="flex items-center space-x-1 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md text-[10px] animate-in fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-semibold text-red-700">{isAi ? 'Delete AI post?' : 'Delete ticket?'}</span>
                <button
                  type="button"
                  id={`btn-confirm-delete-card-${report.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteReport(report.id);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold px-1.5 py-0.5 rounded text-[10px]"
                >
                  {isAi ? 'Delete' : 'Yes'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(false);
                  }}
                  className="text-slate-600 hover:text-slate-900 px-1 text-[10px]"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                id={isAi ? `btn-delete-ai-card-footer-${report.id}` : `btn-delete-card-${report.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                className={
                  isAi
                    ? 'px-2 py-1 rounded-lg text-purple-900 bg-purple-100 hover:text-white hover:bg-red-600 border border-purple-300 hover:border-red-600 transition-all font-semibold text-[11px] flex items-center space-x-1 active:scale-95 shadow-2xs'
                    : 'p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors'
                }
                title={isAi ? 'Permanently delete AI reported post' : 'Permanently delete incident report'}
                aria-label={isAi ? `Delete AI report ${report.ticketNumber}` : `Delete report ${report.ticketNumber}`}
              >
                <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                {isAi && <span>Delete AI</span>}
              </button>
            )
          )}

          {/* "I see this too" / Upvote Button - Light Purple */}
          <button
            type="button"
            id={`btn-upvote-${report.id}`}
            onClick={handleUpvoteClick}
            className={`px-3 py-1.5 rounded-lg border flex items-center space-x-1.5 font-semibold text-xs transition-all active:scale-95 shadow-2xs ${
              hasUpvoted
                ? 'bg-purple-300 hover:bg-purple-400 text-purple-950 border-purple-400 font-bold shadow-xs'
                : 'bg-purple-100 hover:bg-purple-200 text-purple-900 border-purple-300'
            }`}
            title="Confirm this incident exists to prevent duplicate tickets and bump priority"
          >
            <ThumbsUp
              className={`w-3.5 h-3.5 ${hasUpvoted ? 'text-purple-950 fill-purple-950' : 'text-purple-700 group-hover:text-purple-900'}`}
            />
            <span>{hasUpvoted ? 'Confirmed' : 'I see this too'}</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[11px] font-mono font-semibold ${
                hasUpvoted ? 'bg-purple-400 text-purple-950' : 'bg-purple-200/80 text-purple-950'
              }`}
            >
              {report.upvotesCount}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
