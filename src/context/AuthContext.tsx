import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: UserProfile;
  currentRole: UserRole;
  setRole: (role: UserRole) => void;
  isAuthenticated: boolean;
  isAuthorityLoggedIn: boolean;
  isAuthority: boolean;
  loginWithPhoneOtp: (phone: string, otp: string) => Promise<boolean>;
  loginWithEmail: (email: string, otp: string) => Promise<boolean>;
  loginWithEmailPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginAsCitizen: (params: {
    name?: string;
    phone?: string;
    email: string;
    password?: string;
    wardOrDistrict?: string;
    lat?: number;
    lng?: number;
  }) => Promise<boolean>;
  loginAsAuthority: (
    role: 'operator' | 'safety' | 'admin',
    credentials: { badgeOrId: string; passkey: string; stationOrZone?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  logoutAuthority: () => void;
  updateLocationAnchor: (lat: number, lng: number, districtName: string, radiusKm?: number) => void;
  requestLocationPermission: () => Promise<{ success: boolean; error?: string }>;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (show: boolean) => void;
  loginModalTab: 'citizen' | 'authority';
  setLoginModalTab: (tab: 'citizen' | 'authority') => void;
  openLoginModal: (tab?: 'citizen' | 'authority') => void;
  showOnboardingModal: boolean;
  setShowOnboardingModal: (show: boolean) => void;
  isCitizenLoginPageOpen: boolean;
  setIsCitizenLoginPageOpen: (show: boolean) => void;
  locationPermissionStatus: 'prompt' | 'granted' | 'denied';
}

const DEFAULT_USERS: Record<UserRole, UserProfile> = {
  citizen: {
    id: 'usr-citizen-demo',
    name: 'Citizen Reporter',
    phone: '+91 98401 23456',
    email: 'citizen.chennai@citizenmail.in',
    role: 'citizen',
    isVerified: true,
    anchorLocation: {
      lat: 13.0827,
      lng: 80.2707,
      districtName: 'Central Chennai & Anna Salai (Zone 9)',
      radiusKm: 5
    }
  },
  operator: {
    id: 'usr-operator-demo',
    name: 'S. Ramanathan (Executive Engineer - GCC)',
    email: 'ramanathan.s@chennaicorporation.gov.in',
    role: 'operator',
    department: 'Greater Chennai Corporation (GCC) - Public Works & Roads',
    isVerified: true,
    anchorLocation: {
      lat: 13.0839,
      lng: 80.2700,
      districtName: 'Ripon Building - GCC Central Command',
      radiusKm: 15
    }
  },
  safety: {
    id: 'usr-safety-demo',
    name: 'Inspector R. Venkatesh',
    badgeNumber: 'GCP-SAFETY-042',
    role: 'safety',
    department: 'Greater Chennai Police & TNFRS Safety Command',
    isVerified: true,
    anchorLocation: {
      lat: 13.085,
      lng: 80.281,
      districtName: 'Greater Chennai Police Commissionerate, Vepery',
      radiusKm: 25
    }
  },
  admin: {
    id: 'usr-admin-demo',
    name: 'Special Commissioner Dr. K. Radhakrishnan, IAS',
    badgeNumber: 'GCC-BEACON-01',
    role: 'admin',
    department: 'Greater Chennai Multi-Agency Disaster & Incident Command',
    isVerified: true,
    anchorLocation: {
      lat: 13.0827,
      lng: 80.2707,
      districtName: 'Chennai Integrated Command & Control Centre (ICCC)',
      radiusKm: 30
    }
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('civicsafe_current_role');
    return (saved as UserRole) || 'citizen';
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('civicsafe_user_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clear any old placeholder name
        if (parsed?.name && parsed.name.toLowerCase().includes('ananya')) {
          parsed.name = 'Citizen Reporter';
          parsed.email = 'citizen.chennai@citizenmail.in';
          localStorage.setItem('civicsafe_user_profile', JSON.stringify(parsed));
        }
        // If old cached coordinates were San Francisco/western coords, migrate to Chennai
        if (parsed?.anchorLocation?.lat > 30 || parsed?.anchorLocation?.lng < 0) {
          parsed.anchorLocation = DEFAULT_USERS[currentRole].anchorLocation;
        }
        return parsed;
      } catch {
        // fallback
      }
    }
    return DEFAULT_USERS[currentRole];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('civicsafe_authenticated') === 'true';
  });
  const [isAuthorityLoggedIn, setIsAuthorityLoggedIn] = useState<boolean>(() => {
    const isAuth = localStorage.getItem('civicsafe_authority_authenticated') === 'true';
    const savedRole = localStorage.getItem('civicsafe_current_role');
    return isAuth && (savedRole === 'operator' || savedRole === 'safety' || savedRole === 'admin');
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginModalTab, setLoginModalTab] = useState<'citizen' | 'authority'>('citizen');
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  const openLoginModal = (tab?: 'citizen' | 'authority') => {
    if (tab) {
      setLoginModalTab(tab);
    } else {
      if (currentRole === 'operator' || currentRole === 'safety' || currentRole === 'admin') {
        setLoginModalTab('authority');
      } else {
        setLoginModalTab('citizen');
      }
    }
    setIsLoginModalOpen(true);
  };

  const showOnboardingModal = isLoginModalOpen;
  const setShowOnboardingModal = (show: boolean) => {
    setIsLoginModalOpen(show);
    if (show) setLoginModalTab('authority');
  };

  const isCitizenLoginPageOpen = isLoginModalOpen;
  const setIsCitizenLoginPageOpen = (show: boolean) => {
    setIsLoginModalOpen(show);
    if (show) setLoginModalTab('citizen');
  };

  const isAuthority =
    currentRole === 'operator' ||
    currentRole === 'safety' ||
    currentRole === 'admin' ||
    isAuthorityLoggedIn;

  useEffect(() => {
    localStorage.setItem('civicsafe_current_role', currentRole);
    const updated = {
      ...DEFAULT_USERS[currentRole],
      anchorLocation: currentUser.anchorLocation || DEFAULT_USERS[currentRole].anchorLocation
    };
    setCurrentUser(updated);
    localStorage.setItem('civicsafe_user_profile', JSON.stringify(updated));
  }, [currentRole]);

  const setRole = (role: UserRole) => {
    setCurrentRole(role);
    localStorage.setItem('civicsafe_current_role', role);
    if (role === 'operator' || role === 'safety' || role === 'admin') {
      setIsAuthorityLoggedIn(true);
      localStorage.setItem('civicsafe_authority_authenticated', 'true');
    } else {
      setIsAuthorityLoggedIn(false);
      localStorage.setItem('civicsafe_authority_authenticated', 'false');
    }
  };

  const loginAsCitizen = async (params: {
    name?: string;
    phone?: string;
    email: string;
    password?: string;
    wardOrDistrict?: string;
    lat?: number;
    lng?: number;
  }): Promise<boolean> => {
    const emailStr = params.email.trim();
    const rawName = params.name?.trim() || emailStr.split('@')[0];
    // Format email prefix into friendly name if not already formatted
    const formattedName = rawName
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

    const citizenUser: UserProfile = {
      id: `usr-citizen-${Date.now()}`,
      name: formattedName || 'Citizen Reporter',
      phone: params.phone?.trim() || '+91 98401 23456',
      email: emailStr,
      role: 'citizen',
      isVerified: true,
      anchorLocation: {
        lat: params.lat || currentUser.anchorLocation?.lat || 13.0827,
        lng: params.lng || currentUser.anchorLocation?.lng || 80.2707,
        districtName: params.wardOrDistrict || currentUser.anchorLocation?.districtName || 'Central Chennai (Zone 9)',
        radiusKm: 5
      }
    };

    setCurrentRole('citizen');
    setCurrentUser(citizenUser);
    setIsAuthenticated(true);
    setIsAuthorityLoggedIn(false);
    localStorage.setItem('civicsafe_authenticated', 'true');
    localStorage.setItem('civicsafe_current_role', 'citizen');
    localStorage.setItem('civicsafe_authority_authenticated', 'false');
    localStorage.setItem('civicsafe_user_profile', JSON.stringify(citizenUser));
    return true;
  };

  const loginWithEmailPassword = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
    }

    await loginAsCitizen({
      email: trimmedEmail,
      password
    });

    return { success: true };
  };

  const loginWithPhoneOtp = async (phone: string, otp: string): Promise<boolean> => {
    // Simulated phone OTP verification
    if (otp.length >= 4) {
      const newUser: UserProfile = {
        ...DEFAULT_USERS[currentRole],
        phone,
        name: `User (${phone.slice(-4)})`,
        isVerified: true
      };
      setCurrentUser(newUser);
      setIsAuthenticated(true);
      setIsAuthorityLoggedIn(false);
      localStorage.setItem('civicsafe_authenticated', 'true');
      localStorage.setItem('civicsafe_authority_authenticated', 'false');
      localStorage.setItem('civicsafe_user_profile', JSON.stringify(newUser));
      return true;
    }
    return false;
  };

  const loginWithEmail = async (email: string, otp: string): Promise<boolean> => {
    if (otp.length >= 4) {
      const newUser: UserProfile = {
        ...DEFAULT_USERS[currentRole],
        email,
        name: email.split('@')[0],
        isVerified: true
      };
      setCurrentUser(newUser);
      setIsAuthenticated(true);
      setIsAuthorityLoggedIn(false);
      localStorage.setItem('civicsafe_authenticated', 'true');
      localStorage.setItem('civicsafe_authority_authenticated', 'false');
      localStorage.setItem('civicsafe_user_profile', JSON.stringify(newUser));
      return true;
    }
    return false;
  };

  const loginAsAuthority = async (
    role: 'operator' | 'safety' | 'admin',
    credentials: { badgeOrId: string; passkey: string; stationOrZone?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!credentials.badgeOrId || credentials.badgeOrId.trim().length === 0) {
      return { success: false, error: 'Official Badge ID or Officer ID is required.' };
    }
    if (!credentials.passkey || credentials.passkey.trim().length < 4) {
      return { success: false, error: 'Official Security PIN / Passkey must be at least 4 digits.' };
    }

    const baseTemplate = DEFAULT_USERS[role];
    const authorityProfile: UserProfile = {
      ...baseTemplate,
      badgeNumber: credentials.badgeOrId.toUpperCase(),
      name:
        role === 'safety'
          ? `Insp. ${credentials.badgeOrId.toUpperCase()} (Greater Chennai Police)`
          : role === 'operator'
          ? `Eng. ${credentials.badgeOrId.toUpperCase()} (GCC Corporation)`
          : baseTemplate.name,
      department: credentials.stationOrZone || baseTemplate.department,
      isVerified: true
    };

    setCurrentRole(role);
    setCurrentUser(authorityProfile);
    setIsAuthenticated(true);
    setIsAuthorityLoggedIn(true);
    localStorage.setItem('civicsafe_authenticated', 'true');
    localStorage.setItem('civicsafe_current_role', role);
    localStorage.setItem('civicsafe_authority_authenticated', 'true');
    localStorage.setItem('civicsafe_user_profile', JSON.stringify(authorityProfile));
    return { success: true };
  };

  const logoutAuthority = () => {
    setIsAuthorityLoggedIn(false);
    localStorage.setItem('civicsafe_authority_authenticated', 'false');
    setCurrentRole('citizen');
    localStorage.setItem('civicsafe_current_role', 'citizen');
    setCurrentUser(DEFAULT_USERS.citizen);
    localStorage.setItem('civicsafe_user_profile', JSON.stringify(DEFAULT_USERS.citizen));
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsAuthorityLoggedIn(false);
    localStorage.removeItem('civicsafe_authenticated');
    localStorage.removeItem('civicsafe_authority_authenticated');
    setIsLoginModalOpen(false);
  };

  const updateLocationAnchor = (lat: number, lng: number, districtName: string, radiusKm = 5) => {
    setCurrentUser((prev) => {
      const updated = {
        ...prev,
        anchorLocation: {
          lat,
          lng,
          districtName,
          radiusKm
        }
      };
      localStorage.setItem('civicsafe_user_profile', JSON.stringify(updated));
      return updated;
    });
    setLocationPermissionStatus('granted');
  };

  const requestLocationPermission = async (): Promise<{ success: boolean; error?: string }> => {
    if (!navigator.geolocation) {
      setLocationPermissionStatus('denied');
      return { success: false, error: 'Geolocation is not supported by your browser' };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          updateLocationAnchor(latitude, longitude, 'Detected Local Coordinates', 5);
          setLocationPermissionStatus('granted');
          resolve({ success: true });
        },
        (err) => {
          // If denied, fallback to Chennai anchor location smoothly
          setLocationPermissionStatus('denied');
          updateLocationAnchor(13.0827, 80.2707, 'Central Chennai & Anna Salai (Default)', 5);
          resolve({ success: false, error: err.message });
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    });
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        setRole,
        isAuthenticated,
        isAuthorityLoggedIn,
        isAuthority,
        loginWithPhoneOtp,
        loginWithEmail,
        loginWithEmailPassword,
        loginAsCitizen,
        loginAsAuthority,
        logout,
        logoutAuthority,
        updateLocationAnchor,
        requestLocationPermission,
        isLoginModalOpen,
        setIsLoginModalOpen,
        loginModalTab,
        setLoginModalTab,
        openLoginModal,
        showOnboardingModal,
        setShowOnboardingModal,
        isCitizenLoginPageOpen,
        setIsCitizenLoginPageOpen,
        locationPermissionStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
