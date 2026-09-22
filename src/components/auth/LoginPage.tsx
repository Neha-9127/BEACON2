import React, { useState } from 'react';
import {
  Shield,
  UserCheck,
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  Building2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Check,
  MapPin,
  FileCheck2,
  LockKeyhole,
  RadioTower
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LiveCivicBackground } from '../common/LiveCivicBackground';

export const LoginPage: React.FC = () => {
  const {
    loginWithEmailPassword,
    loginAsAuthority,
    currentUser
  } = useAuth();

  // Selected Tab: 'citizen' or 'authority'
  const [selectedRole, setSelectedRole] = useState<'citizen' | 'authority'>('citizen');

  // Citizen form state
  const [citizenEmail, setCitizenEmail] = useState<string>('citizen.chennai@citizenmail.in');
  const [citizenPassword, setCitizenPassword] = useState<string>('citizen123');
  const [showCitizenPassword, setShowCitizenPassword] = useState<boolean>(false);

  // Authority form state
  const [authorityAgency, setAuthorityAgency] = useState<'police' | 'gcc' | 'joint'>('joint');
  const [officerBadge, setOfficerBadge] = useState<string>('GCC-BEACON-01');
  const [authorityPin, setAuthorityPin] = useState<string>('2026');
  const [authorityStation, setAuthorityStation] = useState<string>(
    'Chennai Integrated Command & Control Centre (ICCC)'
  );

  // State feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quick Preset for Citizen
  const handleLoadCitizenPreset = () => {
    setCitizenEmail('citizen.chennai@citizenmail.in');
    setCitizenPassword('citizen123');
    setErrorMessage(null);
  };

  // Quick Preset for Authority
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

  // Citizen Sign-In Handler
  const handleCitizenSubmit = async (e: React.FormEvent) => {
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
        setSuccessMessage('Authentication verified. Loading secure incident dashboard...');
      } else {
        setIsSubmitting(false);
        setErrorMessage(result.error || 'Authentication failed. Please check credentials.');
      }
    } catch {
      setIsSubmitting(false);
      setErrorMessage('An unexpected error occurred during sign-in.');
    }
  };

  // Authority Sign-In Handler
  const handleAuthoritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!officerBadge.trim()) {
      setErrorMessage('Official Badge ID or Officer ID is required.');
      return;
    }

    if (!authorityPin.trim() || authorityPin.length < 4) {
      setErrorMessage('Official Security PIN must be at least 4 digits.');
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

      if (result.success) {
        setSuccessMessage('Official Agency Clearance Approved. Initializing triage console...');
      } else {
        setIsSubmitting(false);
        setErrorMessage(result.error || 'Official verification failed.');
      }
    } catch {
      setIsSubmitting(false);
      setErrorMessage('An unexpected error occurred during agency authentication.');
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 w-full flex flex-col justify-center items-center relative p-4 sm:p-6 selection:bg-blue-600 selection:text-white">
      {/* Dynamic 3D Vanta Globe Background Atmosphere */}
      <LiveCivicBackground />

      <div className="w-full max-w-lg z-10 relative">
        {/* Security Shield Banner Header */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-mono font-bold uppercase tracking-wider shadow-xs">
            <LockKeyhole className="w-3.5 h-3.5 text-blue-600" />
            <span>Secure Access Gateway • Chennai Civic System</span>
          </div>

          <div className="flex items-center justify-center space-x-3 pt-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs tracking-wider">
              <RadioTower className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
              BEACON
            </h1>
          </div>

          <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
            Community Issue & Safety Reporting Platform
          </p>
        </div>

        {/* Main Authentication Card */}
        <div className="bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Card Title Banner */}
          <div className="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Account Sign In
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select your portal type below to proceed to the main system.
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400">
                <Shield className="w-5 h-5" />
              </div>
            </div>

            {/* Security Notice */}
            <div className="mt-3.5 p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center space-x-2 text-[11px] text-slate-300">
              <Lock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span>Dashboard data & live GIS locations are secured behind authentication.</span>
            </div>
          </div>

          {/* Role Selector Tabs: Citizen vs Authority */}
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Select User Clearance
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Option 1: Citizen */}
              <button
                type="button"
                id="btn-login-tab-citizen"
                onClick={() => {
                  setSelectedRole('citizen');
                  setErrorMessage(null);
                }}
                className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  selectedRole === 'citizen'
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div
                    className={`text-xs font-bold ${
                      selectedRole === 'citizen' ? 'text-blue-900' : 'text-slate-800'
                    }`}
                  >
                    Citizen Reporter
                  </div>
                  {selectedRole === 'citizen' && (
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px]">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 leading-tight">
                    File reports & view community feed
                  </div>
                </div>
              </button>

              {/* Option 2: Authority */}
              <button
                type="button"
                id="btn-login-tab-authority"
                onClick={() => {
                  setSelectedRole('authority');
                  setErrorMessage(null);
                }}
                className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  selectedRole === 'authority'
                    ? 'border-slate-900 bg-slate-100 shadow-xs ring-2 ring-slate-900/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      selectedRole === 'authority'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </div>
                  {selectedRole === 'authority' && (
                    <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px]">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div>
                  <div
                    className={`text-xs font-bold ${
                      selectedRole === 'authority' ? 'text-slate-900' : 'text-slate-800'
                    }`}
                  >
                    Civic & Safety Authority
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">
                    Admin console, Police & GCC dispatch
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-5 sm:p-6 space-y-4">
            {/* Feedback Alerts */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* TAB 1: CITIZEN LOGIN */}
            {selectedRole === 'citizen' && (
              <form onSubmit={handleCitizenSubmit} className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1 text-blue-900">
                  <div className="font-bold flex items-center space-x-1.5 text-blue-900">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Citizen Verification Portal</span>
                  </div>
                  <p className="text-[11px] text-blue-800/80 leading-relaxed">
                    Access real-time neighborhood safety alerts, report civic issues with geotagged media, and track resolution timelines.
                  </p>
                </div>

                {/* Email Field */}
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
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Password Field */}
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
                      className="w-full text-xs bg-white border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCitizenPassword(!showCitizenPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                      aria-label={showCitizenPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCitizenPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Quick Demo Helper */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[11px] text-slate-500">Quick Testing:</span>
                  <button
                    type="button"
                    id="btn-fill-demo-citizen"
                    onClick={handleLoadCitizenPreset}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1 underline"
                  >
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>Fill Demo Citizen Credentials</span>
                  </button>
                </div>

                {/* Submit Citizen Button */}
                <button
                  type="submit"
                  id="btn-submit-citizen-login"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 mt-2"
                >
                  <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Access Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* TAB 2: AUTHORITY LOGIN */}
            {selectedRole === 'authority' && (
              <form onSubmit={handleAuthoritySubmit} className="space-y-4">
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs space-y-1 text-slate-800">
                  <div className="font-bold flex items-center space-x-1.5 text-slate-900">
                    <Shield className="w-3.5 h-3.5 text-slate-800" />
                    <span>Official Authority Clearance Access</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Direct access for Greater Chennai Police, GCC Municipal Engineers, and Multi-Agency ICCC Command for triage, bulk merging, and resolution.
                  </p>
                </div>

                {/* Agency Selection */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Designated Civic Agency
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleLoadAuthorityPreset('joint')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        authorityAgency === 'joint'
                          ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <Shield className="w-4 h-4 text-blue-600 mb-1" />
                      <div className="font-bold text-xs text-slate-900">Joint Admin</div>
                      <div className="text-[10px] text-slate-500">ICCC Command</div>
                    </button>

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
                      <div className="text-[10px] text-slate-500">Law & Safety</div>
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
                      <Building2 className="w-4 h-4 text-blue-600 mb-1" />
                      <div className="font-bold text-xs text-slate-900">GCC Works</div>
                      <div className="text-[10px] text-slate-500">Municipal Eng.</div>
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
                      placeholder="e.g. GCC-BEACON-01"
                      className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
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
                      className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Station or Zone */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Station / Jurisdiction
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
                    placeholder="Jurisdiction or Command Station"
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>

                {/* 1-Click Preset Buttons */}
                <div className="pt-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500 mb-1.5">
                    1-Click Agency Test Credentials:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleLoadAuthorityPreset('joint')}
                      className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-medium border border-slate-200 transition-colors"
                    >
                      🛡️ Joint Admin (GCC-BEACON-01)
                    </button>
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
                      🏛️ GCC Works (GCC-EE-Z09)
                    </button>
                  </div>
                </div>

                {/* Submit Authority */}
                <button
                  type="submit"
                  id="btn-submit-authority-login"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 mt-2"
                >
                  <KeyRound className="w-4 h-4 text-white" />
                  <span>
                    {isSubmitting ? 'Verifying Agency Clearance...' : 'Verify Official Clearance & Enter'}
                  </span>
                </button>
              </form>
            )}
          </div>

          {/* Security Features Bottom Pill Bar */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              <span>Session-Level Data Privacy</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>Geo-Fenced Verification</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Audit Logged Access</span>
            </div>
          </div>
        </div>

        {/* System Subtext */}
        <p className="text-center text-[11px] text-slate-500 mt-4">
          BEACON Multi-Agency Civic Infrastructure Platform • Greater Chennai Authority
        </p>
      </div>
    </div>
  );
};
