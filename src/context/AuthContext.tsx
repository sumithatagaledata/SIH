import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, PatientProfile, DoctorProfile, HospitalAccount, LanguageCode } from '../types';
import { db } from '../services/mockDatabase';
import { LocationHospitalService } from '../services/locationHospitalService';
import { cloudDataService, FirebaseAuthService } from '../services/firebaseService';
import { centralAuthService } from '../services/centralAuthService';

export interface RegisterPatientData {
  fullName: string;
  email: string;
  password?: string;
  phone: string;
  dob: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  bloodGroup: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  preferredLanguage: LanguageCode;
  address?: string;
  city?: string;
  pincode?: string;
}

export interface RegisterStaffData {
  fullName: string;
  email: string;
  password?: string;
  phone: string;
  role: 'DOCTOR' | 'TRIAGE' | 'HOSPITAL_ADMIN';
  registrationNumber?: string;
  specialization?: string;
  hospitalId?: string;
  hospitalName?: string;
}

export interface RegisterHospitalData {
  hospitalName: string;
  registrationId: string;
  address: string;
  city: string;
  location: string;
  state?: string;
  pincode?: string;
  emergencyContact: string;
  email: string;
  password: string;
  ambulanceAvailable: boolean;
  coordinates?: { lat: number; lng: number };
  departments?: string[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  currentRole: UserRole | null;
  patientProfile?: PatientProfile;
  doctorProfile?: DoctorProfile;
  hospitalAccount?: HospitalAccount;
  login: (email: string, password?: string, role?: UserRole) => Promise<{ success: boolean; message?: string; emailUnverified?: boolean; email?: string; patientId?: string }>;
  registerPatient: (data: RegisterPatientData) => Promise<{ success: boolean; requiresVerification?: boolean; email?: string; patientId?: string; devCode?: string; message?: string }>;
  registerStaff: (data: RegisterStaffData) => Promise<{ success: boolean; message?: string }>;
  registerHospital: (data: RegisterHospitalData) => Promise<{ success: boolean; hospitalId?: string; message?: string }>;
  verifyEmailOtp: (email: string, code: string) => Promise<{ success: boolean; message?: string }>;
  resendVerificationOtp: (email: string) => Promise<{ success: boolean; message?: string; devCode?: string }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  updatePatientProfile: (profile: Partial<PatientProfile>) => void;
}

const AUTH_STORAGE_KEY = 'medibridge_active_auth_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved).isAuthenticated === true : false;
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved).user : null;
    } catch {
      return null;
    }
  });

  const [patientProfile, setPatientProfile] = useState<PatientProfile | undefined>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved).patientProfile : undefined;
    } catch {
      return undefined;
    }
  });
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | undefined>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved).doctorProfile : undefined;
    } catch {
      return undefined;
    }
  });
  const [hospitalAccount, setHospitalAccount] = useState<HospitalAccount | undefined>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved).hospitalAccount : undefined;
    } catch {
      return undefined;
    }
  });

  // Sync profile when currentUser changes
  useEffect(() => {
    if (currentUser && isAuthenticated) {
      if (currentUser.role === 'PATIENT') {
        const p = db.getPatientByUserId(currentUser.id) || db.getPatientById(currentUser.id) || (patientProfile?.userId === currentUser.id ? patientProfile : undefined);
        if (p) {
          setPatientProfile(p);
        } else {
          cloudDataService.findPatientByPatientId(currentUser.email || currentUser.id).then(found => {
            if (found) {
              setPatientProfile(found);
              db.createPatientProfile(found);
            }
          });
        }
        setDoctorProfile(undefined);
        setHospitalAccount(undefined);
      } else if (currentUser.role === 'DOCTOR') {
        let d = db.getDoctorByUserId(currentUser.id);
        if (!d) {
          const registeredHosp = db.getHospitals()[0];
          d = {
            id: `doc-${currentUser.id}`,
            userId: currentUser.id,
            registrationNumber: 'MCI-2026-ACTIVE',
            qualification: 'MBBS, MD',
            specialization: 'Internal & Emergency Medicine',
            hospitalId: registeredHosp?.id || '',
            hospitalName: registeredHosp?.name || 'Registered Medical Facility',
            departmentId: 'dept-001',
            departmentName: 'Emergency & Critical Care',
            experienceYears: 12,
            isAvailable: true,
            activePatientsCount: 0
          };
          db.createDoctorProfile(d);
        }
        setDoctorProfile(d);
        setPatientProfile(undefined);
        setHospitalAccount(undefined);
      } else if (currentUser.role === 'HOSPITAL_ADMIN') {
        // Check if this user has a hospital account (portal login)
        const hacct = db.getHospitalAccountByUserId(currentUser.id);
        setHospitalAccount(hacct || undefined);
        setPatientProfile(undefined);
        setDoctorProfile(undefined);
      } else {
        setPatientProfile(undefined);
        setDoctorProfile(undefined);
        setHospitalAccount(undefined);
      }

      // Persist session with profile
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          isAuthenticated: true,
          user: currentUser,
          patientProfile: patientProfile || (currentUser.role === 'PATIENT' ? db.getPatientByUserId(currentUser.id) : undefined),
          doctorProfile: doctorProfile || (currentUser.role === 'DOCTOR' ? db.getDoctorByUserId(currentUser.id) : undefined),
          hospitalAccount: hospitalAccount || (currentUser.role === 'HOSPITAL_ADMIN' ? db.getHospitalAccountByUserId(currentUser.id) : undefined)
        })
      );
    } else {
      setPatientProfile(undefined);
      setDoctorProfile(undefined);
      setHospitalAccount(undefined);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [currentUser, isAuthenticated, patientProfile?.patientId]);

  // Real Email/Patient ID & Password Login (Universal Cross-Device Resolution)
  const login = async (identifier: string, password?: string, role?: UserRole): Promise<{ success: boolean; message?: string; emailUnverified?: boolean; email?: string; patientId?: string }> => {
    const cleanId = identifier.trim();
    if (!cleanId) {
      return { success: false, message: 'Please enter your registered Email or Patient ID.' };
    }

    // 1. Centralized Cloud Authentication Call
    const res = await centralAuthService.login(cleanId, password, role);
    if (!res.success) {
      if (res.emailUnverified) {
        return {
          success: false,
          emailUnverified: true,
          email: res.email,
          patientId: res.patientId,
          message: res.message || 'Your email address is not verified yet. Please enter the verification code sent to your email.'
        };
      }
      return {
        success: false,
        message: res.message || `No registered account found for "${cleanId}". Please check your credentials or click 'Create Account' to register.`
      };
    }
    if (!res.user) {
      return { success: false, message: 'Authentication failed. Please try again.' };
    }

    const user = res.user;

    // 2. Load and set appropriate profile
    if (user.role === 'PATIENT') {
      const p = res.patientProfile || db.getPatientByUserId(user.id) || db.getPatientByPatientId(cleanId);
      if (p) {
        setPatientProfile(p);
        db.createPatientProfile(p);
      }
      setDoctorProfile(undefined);
      setHospitalAccount(undefined);
    } else if (user.role === 'DOCTOR') {
      const d = res.doctorProfile || db.getDoctorByUserId(user.id);
      if (d) {
        setDoctorProfile(d);
        db.createDoctorProfile(d);
      }
      setPatientProfile(undefined);
      setHospitalAccount(undefined);
    } else if (user.role === 'HOSPITAL_ADMIN' || user.role === 'HOSPITAL') {
      const hacct = res.hospitalAccount || db.getHospitalAccountByUserId(user.id);
      if (hacct) {
        setHospitalAccount(hacct);
        db.createHospitalAccount(hacct);
      }
      setPatientProfile(undefined);
      setDoctorProfile(undefined);
    } else {
      setHospitalAccount(undefined);
      setPatientProfile(undefined);
      setDoctorProfile(undefined);
    }

    setCurrentUser(user);
    db.createUser(user);
    setIsAuthenticated(true);

    db.logAction(
      user.id,
      user.fullName,
      user.role,
      'LOGIN',
      'AuthSession',
      user.id,
      `User signed in successfully across devices via: ${cleanId}`
    );

    // Synchronize Firebase Auth session if active
    if (user.email && password) {
      FirebaseAuthService.loginUser(user.email, password).catch(() => {});
    }

    return { success: true };
  };

  // Register New Patient with Unique Patient ID & Email Verification
  const registerPatient = async (data: RegisterPatientData): Promise<{ success: boolean; requiresVerification?: boolean; email?: string; patientId?: string; devCode?: string; message?: string }> => {
    const res = await centralAuthService.registerPatient(data);
    if (!res.success) {
      return {
        success: false,
        message: res.message || 'Failed to create patient account in central database.'
      };
    }

    if (res.requiresVerification) {
      return {
        success: true,
        requiresVerification: true,
        email: res.email,
        patientId: res.patientId,
        devCode: res.devCode,
        message: res.message
      };
    }

    if (res.user && res.patientProfile) {
      const newUser = res.user;
      const newProfile = res.patientProfile;

      setCurrentUser(newUser);
      setPatientProfile(newProfile);
      setIsAuthenticated(true);

      db.logAction(
        newUser.id,
        newUser.fullName,
        'PATIENT',
        'LOGIN',
        'PatientProfile',
        newProfile.id,
        `New patient account registered centrally with Patient ID: ${newProfile.patientId}`
      );

      return { success: true, patientId: newProfile.patientId };
    }

    return { success: true, patientId: res.patientId };
  };

  // Verify Patient Email with 6-digit OTP
  const verifyEmailOtp = async (email: string, code: string): Promise<{ success: boolean; message?: string }> => {
    const res = await centralAuthService.verifyEmailOtp(email, code);
    if (!res.success || !res.user) {
      return {
        success: false,
        message: res.message || 'Verification failed. Please check the code and try again.'
      };
    }

    const newUser = res.user;
    const newProfile = res.patientProfile;

    if (newProfile) {
      setPatientProfile(newProfile);
      db.createPatientProfile(newProfile);
    }
    setCurrentUser(newUser);
    db.createUser(newUser);
    setIsAuthenticated(true);

    db.logAction(
      newUser.id,
      newUser.fullName,
      'PATIENT',
      'LOGIN',
      'PatientProfile',
      newProfile?.id || newUser.id,
      `Patient email verified and authenticated. Patient ID: ${newProfile?.patientId || newUser.patientId}`
    );

    return { success: true, message: res.message };
  };

  // Resend 6-digit OTP to patient's email
  const resendVerificationOtp = async (email: string): Promise<{ success: boolean; message?: string; devCode?: string }> => {
    const res = await centralAuthService.resendVerificationOtp(email);
    return {
      success: res.success,
      message: res.message,
      devCode: res.devCode
    };
  };

  // Register New Staff / Doctor / Admin
  const registerStaff = async (data: RegisterStaffData): Promise<{ success: boolean; message?: string }> => {
    const res = await centralAuthService.registerStaff(data);
    if (!res.success || !res.user) {
      return {
        success: false,
        message: res.message || 'Failed to register staff account in central database.'
      };
    }

    const newUser = res.user;
    if (res.doctorProfile) {
      setDoctorProfile(res.doctorProfile);
    }
    setCurrentUser(newUser);
    setIsAuthenticated(true);

    db.logAction(
      newUser.id,
      newUser.fullName,
      newUser.role,
      'LOGIN',
      'StaffProfile',
      newUser.id,
      `Staff registered centrally with role: ${data.role}`
    );

    return { success: true };
  };

  const registerHospital = async (data: RegisterHospitalData): Promise<{ success: boolean; hospitalId?: string; message?: string }> => {
    const res = await centralAuthService.registerHospital(data);
    const resolvedHospital = res.hospitalAccount || (res as any).hospital;
    if (!res.success || !res.user || !resolvedHospital) {
      return {
        success: false,
        message: res.message || 'Failed to create hospital account in central database.'
      };
    }

    const newUser = res.user;
    const newHospitalAccount = resolvedHospital;

    setCurrentUser(newUser);
    setHospitalAccount(newHospitalAccount);
    setIsAuthenticated(true);

    db.logAction(
      newUser.id,
      newUser.fullName,
      'HOSPITAL_ADMIN',
      'LOGIN',
      'HospitalAccount',
      res.hospitalId || newHospitalAccount.id,
      `Hospital registered centrally: ${data.hospitalName} (ID: ${res.hospitalId || newHospitalAccount.id})`
    );

    return { success: true, hospitalId: res.hospitalId || newHospitalAccount.id };
  };

  // Role switching is strictly disabled; role is determined solely by authenticated credentials
  const switchRole = (_role: UserRole) => {
    console.warn('[Security] Frontend role switching is disabled. Authenticated session governs role access.');
  };

  // Logout
  const logout = () => {
    if (currentUser) {
      db.logAction(
        currentUser.id,
        currentUser.fullName,
        currentUser.role,
        'LOGIN',
        'AuthSession',
        currentUser.id,
        'User logged out from session'
      );
    }
    setIsAuthenticated(false);
    centralAuthService.clearSession();
    FirebaseAuthService.logout().catch(() => {});
    setCurrentUser(null);
    setPatientProfile(undefined);
    setDoctorProfile(undefined);
    setHospitalAccount(undefined);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const updatePatientProfile = (updated: Partial<PatientProfile>) => {
    if (patientProfile) {
      const newProfile = { ...patientProfile, ...updated };
      setPatientProfile(newProfile);
      db.createPatientProfile(newProfile);

      // Persist updates to central cloud database
      const activeUser: User = currentUser || {
        id: newProfile.userId || `usr-${newProfile.patientId}`,
        email: newProfile.email || '',
        phone: newProfile.phone || '',
        fullName: newProfile.fullName || 'Registered Patient',
        role: 'PATIENT',
        createdAt: newProfile.createdAt || new Date().toISOString()
      };
      cloudDataService.registerPatient(newProfile, activeUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        currentRole: currentUser?.role || null,
        patientProfile,
        doctorProfile,
        hospitalAccount,
        login,
        registerPatient,
        registerStaff,
        registerHospital,
        verifyEmailOtp,
        resendVerificationOtp,
        logout,
        switchRole,
        updatePatientProfile
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
