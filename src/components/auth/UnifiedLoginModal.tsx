import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Shield,
  Building2,
  UserCheck,
  KeyRound,
  ShieldAlert,
  AlertTriangle,
  MapPin,
  ArrowRight,
  LogOut,
  Camera,
  Sparkles,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useIncidents } from '../../context/IncidentContext';

interface UnifiedLoginModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialTab?: 'citizen' | 'authority';
  onLoginSuccessAndReport?: () => void;
}

export const UnifiedLoginModal: React.FC<UnifiedLoginModalProps> = ({
  isOpen,
  onClose,
  initialTab,
  onLoginSuccessAndReport
}) => {
  const {
    isLoginModalOpen,
    setIsLoginModalOpen,
    loginModalTab,
    setLoginModalTab,
    currentUser,
    currentRole,
    isAuthorityLoggedIn,
    loginWithEmailPassword,
    loginAsAuthority,
    logoutAuthority,
    logout,
    updateLocationAnchor,
    requestLocationPermission
  } = useAuth();

  const { setIsReportingModalOpen } = useIncidents();

  // Tab mode: 'citizen' or 'authority'
  const [selectedRole, setSelectedRole] = useState<'citizen' | 'authority'>(
    initialTab || loginModalTab || (currentRole === 'citizen' ? 'citizen' : 'authority')
  );

  // Synchronize when initialTab or loginModalTab updates
  useEffect(() => {
    if (initialTab) {
      setSelectedRole(initialTab);
    } else if (loginModalTab) {
      setSelectedRole(loginModalTab);
    }
  }, [initialTab, loginModalTab]);

  // Citizen Form State
  const [citizenEmail, setCitizenEmail] = useState<string>(
    currentUser?.email || 'citizen.chennai@citizenmail.in'
  );
  const [citizenPassword, setCitizenPassword] = useState<string>('citizen123');
  const [showCitizenPassword, setShowCitizenPassword] = useState<boolean>(false);

  // Authority Form State
  const [authorityAgency, setAuthorityAgency] = useState<'police' | 'gcc' | 'joint'>('police');
  const [officerBadge, setOfficerBadge] = useState<string>('GCP-SHO-K4');
  const [authorityPin, setAuthorityPin] = useState<string>('2026');
  const [authorityStation, setAuthorityStation] = useState<string>(
    'K-4 Anna Nagar Police Station, West Chennai'
  );

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Determine visibility
  const visible = isOpen !== undefined ? isOpen : isLoginModalOpen;

  if (!visible) return null;

  const handleClose = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (onClose) {
      onClose();
    } else {
      setIsLoginModalOpen(false);
    }
  };

  // Quick Preset for Citizen Demo
  const handleLoadCitizenPreset = () => {
    setCitizenEmail('citizen.chennai@citizenmail.in');
    setCitizenPassword('citizen123');
    setErrorMessage(null);
  };

  // Quick Preset for Authority Demo
  const handleLoadAuthorityPreset = (agency: 'police' | 'gcc' | 'joint') => {
    setAuthorityAgency(agency);
    setErrorMessage(null);
    if (agency === 'police') {
      setOfficerBadge('GCP-SHO-K4');
      setAuthorityPin('2026');
      setAuthorityStation('K-4 Anna Nagar Police Station, West Chennai');
    } else if (agency === 'gcc') {
      setOfficerBadge('GCC-EE-Z09');
      setAuthorityPin('2026');
      setAuthorityStation('Zone 9 T. Nagar - Greater Chennai Corporation Works');
    } else {
      setOfficerBadge('GCC-BEACON-01');
      setAuthorityPin('2026');
      setAuthorityStation('Chennai Integrated Command & Control Centre (ICCC)');
    }
  };

  // Submit Citizen Login
  const handleCitizenSubmit = async (e: React.FormEvent, openReport = false) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = citizenEmail.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!citizenPassword || citizenPassword.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await loginWithEmailPassword(trimmedEmail, citizenPassword);

      if (result.success) {
        setSuccessMessage('Citizen Sign-In Successful! Redirecting...');
        setTimeout(() => {
          setIsSubmitting(false);
          handleClose();
          if (openReport) {
            if (onLoginSuccessAndReport) {
              onLoginSuccessAndReport();
            } else {
              setIsReportingModalOpen(true);
            }
          }
        }, 400);
      } else {
        setIsSubmitting(false);
        setErrorMessage(result.error || 'Authentication failed. Please verify credentials.');
      }
    } catch {
      setIsSubmitting(false);
      setErrorMessage('An unexpected error occurred during sign-in.');
    }
  };

  // Submit Authority Login
  const handleAuthoritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!officerBadge.trim()) {
      setErrorMessage('Official Officer Badge / ID is required.');
      return;
    }

    if (!authorityPin.trim() || authorityPin.length < 4) {
      setErrorMessage('Security PIN must be at least 4 digits.');
      return;
    }

    setIsSubmitting(true);

    const targetRole: 'safety' | 'operator' | 'admin' =
      authorityAgency === 'police' ? 'safety' : authorityAgency === 'gcc' ? 'operator' : 'admin';

    try {
      const result = await loginAsAuthority(targetRole, {
        badgeOrId: officerBadge.trim(),
        passkey: authorityPin.trim(),
        stationOrZone: authorityStation.trim()
      });

      setIsSubmitting(false);

      if (result.success) {
        setSuccessMessage('Official Authority Clearance Verified. Access Granted.');
        setTimeout(() => {
          handleClose();
        }, 400);
      } else {
        setErrorMessage(result.error || 'Authentication failed. Please verify credentials.');
      }
    } catch {
      setIsSubmitting(false);
      setErrorMessage('An unexpected error occurred during authority verification.');
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="unified-login-modal"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150 my-auto"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 text-[11px] font-mono uppercase tracking-widest text-blue-400 font-semibold mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>CivicSafe Chennai • Unified Access Portal</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Sign In to CivicSafe
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Select your account type below to access community incident reporting or official civic dispatch.
          </p>
        </div>

        {/* Unified Role Selector: Citizen vs Authority */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
            Step 1: Select Account Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Option 1: Citizen */}
            <button
              type="button"
              id="btn-select-citizen-role"
              onClick={() => {
                setSelectedRole('citizen');
                setLoginModalTab('citizen');
                setErrorMessage(null);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between active:scale-95 ${
                selectedRole === 'citizen'
                  ? 'border-blue-600 bg-white shadow-xs text-slate-900 ring-2 ring-blue-600/10'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-sm font-bold text-slate-900">
                  Citizen Reporter
                </div>
                {selectedRole === 'citizen' && (
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <div>
                <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  File reports & track neighborhood alerts
                </div>
              </div>
            </button>

            {/* Option 2: Authority */}
            <button
              type="button"
              id="btn-select-authority-role"
              onClick={() => {
                setSelectedRole('authority');
                setLoginModalTab('authority');
                setErrorMessage(null);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between active:scale-95 ${
                selectedRole === 'authority'
                  ? 'border-slate-900 bg-white shadow-xs text-slate-900 ring-2 ring-slate-900/10'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    selectedRole === 'authority'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                </div>
                {selectedRole === 'authority' && (
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Civic Authority
                </div>
                <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                  Police, GCC & Emergency dispatch triage
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Active Session Notice if already logged in */}
          {currentUser && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-500">Current Session:</span>
                <span className="font-semibold text-slate-900 truncate max-w-[170px] sm:max-w-[220px]">
                  {currentUser.name} ({currentRole})
                </span>
              </div>
              {isAuthorityLoggedIn && (
                <button
                  type="button"
                  onClick={logoutAuthority}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1 transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          )}

          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center space-x-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: CITIZEN LOGIN FORM                                */}
          {/* ======================================================== */}
          {selectedRole === 'citizen' && (
            <form onSubmit={(e) => handleCitizenSubmit(e, false)} className="space-y-4">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1 text-slate-800">
                <div className="font-semibold flex items-center space-x-1.5 text-blue-900">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Citizen Reporter Sign-In</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Sign in with your email and password to upload geo-tagged hazard photos, upvote community safety issues, and receive live progress alerts.
                </p>
              </div>

              {/* Email field */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    id="input-citizen-email"
                    required
                    value={citizenEmail}
                    onChange={(e) => {
                      setCitizenEmail(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="citizen.chennai@citizenmail.in"
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showCitizenPassword ? 'text' : 'password'}
                    id="input-citizen-password"
                    required
                    value={citizenPassword}
                    onChange={(e) => {
                      setCitizenPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="••••••••"
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCitizenPassword(!showCitizenPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    aria-label={showCitizenPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCitizenPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Quick Demo Fill Helper */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-[11px] text-slate-500">Need demo access?</span>
                <button
                  type="button"
                  id="btn-fill-demo-citizen"
                  onClick={handleLoadCitizenPreset}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1 underline"
                >
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  <span>Fill Demo Citizen Account</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="submit"
                  id="btn-submit-citizen-login"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Verifying Account...' : 'Sign In as Citizen'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  id="btn-citizen-login-and-report"
                  onClick={(e) => handleCitizenSubmit(e, true)}
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-all flex items-center justify-center space-x-2 shadow-xs active:scale-95"
                >
                  <Camera className="w-3.5 h-3.5 text-slate-600" />
                  <span>Sign In & File New Report Directly</span>
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* TAB 2: AUTHORITY LOGIN FORM                              */}
          {/* ======================================================== */}
          {selectedRole === 'authority' && (
            <form onSubmit={handleAuthoritySubmit} className="space-y-4">
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs space-y-1 text-slate-800">
                <div className="font-semibold flex items-center space-x-1.5 text-slate-900">
                  <Lock className="w-3.5 h-3.5 text-slate-700" />
                  <span>Official Authority Resolution Clearance</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Restricted to Greater Chennai Police, GCC Municipal Engineers, and ICCC Emergency Operations. Authorized officers can resolve tickets, dispatch field units, and manage operational triage.
                </p>
              </div>

              {/* Agency Selector */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Designated Civic / Safety Agency
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadAuthorityPreset('police')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      authorityAgency === 'police'
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 text-blue-600 mb-1" />
                    <div className="font-bold text-xs text-slate-900">Chennai Police</div>
                    <div className="text-[10px] text-slate-500">Law & Order / SHO</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLoadAuthorityPreset('gcc')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      authorityAgency === 'gcc'
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-amber-600 mb-1" />
                    <div className="font-bold text-xs text-slate-900">GCC Works</div>
                    <div className="text-[10px] text-slate-500">Municipal Engineer</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLoadAuthorityPreset('joint')}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      authorityAgency === 'joint'
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-indigo-600 mb-1" />
                    <div className="font-bold text-xs text-slate-900">Joint Admin</div>
                    <div className="text-[10px] text-slate-500">ICCC Command</div>
                  </button>
                </div>
              </div>

              {/* Badge and PIN */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Officer Badge / ID
                  </label>
                  <input
                    type="text"
                    id="input-authority-badge"
                    required
                    value={officerBadge}
                    onChange={(e) => {
                      setOfficerBadge(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="e.g. GCP-SHO-K4"
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Security PIN
                  </label>
                  <input
                    type="password"
                    id="input-authority-pin"
                    required
                    value={authorityPin}
                    onChange={(e) => {
                      setAuthorityPin(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="••••"
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                  />
                </div>
              </div>

              {/* Station or Zone */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Station / Zonal Jurisdiction
                </label>
                <input
                  type="text"
                  id="input-authority-station"
                  required
                  value={authorityStation}
                  onChange={(e) => {
                    setAuthorityStation(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="e.g. K-4 Anna Nagar Police Station"
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                />
              </div>

              {/* Quick Demo Presets */}
              <div className="pt-1">
                <div className="text-[10px] uppercase font-semibold text-slate-500 mb-1.5">
                  1-Click Official Demo Presets:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleLoadAuthorityPreset('police')}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-medium border border-slate-200 transition-colors"
                  >
                    👮 Police SHO (GCP-SHO-K4)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadAuthorityPreset('gcc')}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-medium border border-slate-200 transition-colors"
                  >
                    🏛️ GCC Engineer (GCC-EE-Z09)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadAuthorityPreset('joint')}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-medium border border-slate-200 transition-colors"
                  >
                    🛡️ Joint Admin (GCC-BEACON-01)
                  </button>
                </div>
              </div>

              {/* Submit Authority */}
              <button
                type="submit"
                id="btn-submit-authority-login"
                disabled={isSubmitting}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 mt-2"
              >
                <KeyRound className="w-4 h-4 text-white" />
                <span>
                  {isSubmitting ? 'Verifying Official Clearance...' : 'Verify Official Credentials & Enter'}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
