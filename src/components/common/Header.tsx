import React from 'react';
import {
  UserCheck,
  MapPin,
  Plus,
  Smartphone,
  Monitor,
  LogOut,
  LayoutDashboard,
  RadioTower
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useIncidents } from '../../context/IncidentContext';

interface HeaderProps {
  isMobileFrame: boolean;
  onToggleMobileFrame: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isMobileFrame, onToggleMobileFrame }) => {
  const {
    currentRole,
    setRole,
    currentUser,
    logout
  } = useAuth();
  const {
    setIsReportingModalOpen
  } = useIncidents();

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2.5 text-white shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand & App Name: BEACON */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0 tracking-wider">
            <RadioTower className="w-4 h-4 text-white stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <h1 className="text-sm font-bold text-white truncate tracking-tight uppercase">
                BEACON
              </h1>
            </div>
            <div className="flex items-center space-x-1 text-[11px] text-slate-300 truncate">
              <MapPin className="w-3 h-3 text-blue-400 flex-shrink-0" />
              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                {currentUser.anchorLocation?.districtName || 'Metro Central Command'}
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right Controls */}
        <div className="flex items-center space-x-2">
          {/* Quick Admin Triage Toggle Button */}
          {currentRole !== 'admin' ? (
            <button
              type="button"
              id="btn-quick-admin-console"
              onClick={() => setRole('admin')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 shadow-2xs flex items-center space-x-1.5 transition-all active:scale-95"
              title="Open Unified Multi-Agency Admin Triage Console"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-purple-700 stroke-[2]" />
              <span className="hidden md:inline">Admin Triage Console</span>
              <span className="md:hidden">Admin</span>
            </button>
          ) : (
            <button
              type="button"
              id="btn-quick-citizen-feed"
              onClick={() => setRole('citizen')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 shadow-2xs flex items-center space-x-1.5 transition-all active:scale-95"
              title="Switch back to Citizen Mobile Feed"
            >
              <UserCheck className="w-3.5 h-3.5 text-purple-700 stroke-[2]" />
              <span className="hidden md:inline">Citizen Feed View</span>
              <span className="md:hidden">Citizen</span>
            </button>
          )}

          {/* User Session Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="font-medium truncate max-w-[130px]">{currentUser.name}</span>
          </div>

          {/* Sign Out Button - Light Purple */}
          <button
            type="button"
            id="btn-header-logout"
            onClick={logout}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all shadow-2xs active:scale-95 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300"
            title={`Signed in as ${currentUser.name}. Click to sign out.`}
          >
            <LogOut className="w-3.5 h-3.5 text-purple-700 flex-shrink-0" />
            <span className="hidden sm:inline">Sign Out</span>
            <span className="sm:hidden">Sign Out</span>
          </button>

          {/* Mobile frame simulator toggle for desktop previewers - Light Purple */}
          <button
            type="button"
            onClick={onToggleMobileFrame}
            title={isMobileFrame ? 'Switch to Full Screen View' : 'Switch to Mobile Device Frame View'}
            className="p-1.5 rounded-lg border border-purple-300 bg-purple-100 hover:bg-purple-200 text-purple-900 transition-colors hidden md:flex items-center space-x-1 text-xs font-semibold shadow-2xs"
          >
            {isMobileFrame ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-purple-700" />
                <span className="hidden lg:inline text-[11px]">Full Width</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-purple-700" />
                <span className="hidden lg:inline text-[11px]">Mobile Frame</span>
              </>
            )}
          </button>

          {/* Report Issue Button - IN RED as specified */}
          <button
            type="button"
            id="btn-header-file-report"
            onClick={() => setIsReportingModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-sm border border-red-500 flex items-center space-x-1.5 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Report Issue</span>
          </button>
        </div>
      </div>
    </header>
  );
};

