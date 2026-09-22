import React from 'react';
import {
  AlertTriangle,
  BellRing,
  Volume2,
  VolumeX,
  X,
  ChevronRight,
  ShieldAlert,
  Flame,
  Radio
} from 'lucide-react';
import { useIncidents } from '../../context/IncidentContext';
import { testSafetyAlertSiren, playEmergencyAlertBuzzer } from '../../utils/geoRouting';

interface SafetyAlertBannerProps {
  onSelectReportById: (reportId: string) => void;
}

export const SafetyAlertBanner: React.FC<SafetyAlertBannerProps> = ({ onSelectReportById }) => {
  const {
    activePushAlert,
    dismissPushAlert,
    alertRadiusKm,
    isSoundMuted,
    setIsSoundMuted
  } = useIncidents();

  if (!activePushAlert) return null;

  return (
    <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 z-[1100] animate-in slide-in-from-top-4 duration-300">
      <div
        id="safety-push-alert-card"
        className="bg-white text-slate-900 rounded-xl shadow-xl border-l-4 border-l-red-600 border border-slate-200 p-3.5 space-y-2.5 overflow-hidden"
      >
        {/* APNs / FCM Push Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-red-600 flex items-center justify-center flex-shrink-0 animate-pulse">
              <Flame className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">
                  FCM / APNs Geo-Alert
                </span>
                <span className="text-[9px] bg-red-50 text-red-700 border border-red-200 px-1 rounded font-mono font-semibold">
                  {alertRadiusKm} km Geo-Fence
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 truncate">
                {activePushAlert.ticketNumber} • {activePushAlert.timestamp}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsSoundMuted(false);
                playEmergencyAlertBuzzer();
              }}
              title="Ring Loud Emergency Buzzer"
              className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 border border-red-500 text-[10px] font-bold text-white transition-colors animate-pulse shadow-xs"
            >
              <span>BUZZER</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSoundMuted(!isSoundMuted)}
              title={isSoundMuted ? 'Unmute alert sirens' : 'Mute alert sirens'}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {isSoundMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-amber-600" />
              )}
            </button>
            <button
              type="button"
              id="btn-dismiss-safety-alert"
              onClick={dismissPushAlert}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Alert Content */}
        <div className="space-y-1">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-red-600">
            <Radio className="w-3.5 h-3.5 text-red-600 animate-ping" />
            <span>
              EMERGENCY PROXIMITY ALERT ({activePushAlert.distanceKm.toFixed(1)} km away)
            </span>
          </div>
          <h4 className="text-xs font-bold text-slate-900 leading-snug">
            {activePushAlert.title}
          </h4>
          <p className="text-[11px] text-slate-600 line-clamp-2">
            {activePushAlert.address}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-1 flex items-center space-x-2">
          <button
            type="button"
            id="btn-view-emergency-hazard"
            onClick={() => {
              onSelectReportById(activePushAlert.reportId);
              dismissPushAlert();
            }}
            className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Inspect Hazard Queue</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={dismissPushAlert}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};
