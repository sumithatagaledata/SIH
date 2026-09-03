import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, PatientProfile, DoctorProfile, HospitalAccount, LanguageCode } from '../types';
import { db } from '../services/mockDatabase';
import { LocationHospitalService } from '../services/locationHospitalService';

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
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  registerPatient: (data: RegisterPatientData) => Promise<{ success: boolean; patientId?: string; message?: string }>;
  registerStaff: (data: RegisterStaffData) => Promise<{ success: boolean; message?: string }>;
  registerHospital: (data: RegisterHospitalData) => Promise<{ success: boolean; hospitalId?: string; message?: string }>;
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

  const [patientProfile, setPatientProfile] = useState<PatientProfile | undefined>(undefined);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | undefined>(undefined);
  const [hospitalAccount, setHospitalAccount] = useState<HospitalAccount | undefined>(undefined);

  // Sync profile when currentUser changes
  useEffect(() => {
    if (currentUser && isAuthenticated) {
      if (currentUser.role === 'PATIENT') {
        let p = db.getPatientByUserId(currentUser.id);
        if (!p) {
          // If no patient profile exists, create a default real one for this registered user
          const uniqueId = db.generateUniquePatientId();
          p = {
            id: `pat-${currentUser.id}`,
            userId: currentUser.id,
            patientId: uniqueId,
            abhaId: `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
            abhaAddress: `${currentUser.fullName.toLowerCase().replace(/\s+/g, '.') || 'patient'}@abdm`,
            dob: '1990-01-01',
            age: 36,
            gender: 'MALE',
            bloodGroup: 'O+',
            emergencyContactName: 'Family Contact',
            emergencyContactPhone: currentUser.phone || '+91 98000 00000',
            emergencyContactRelation: 'Relative',
            address: 'Registered Residence',
            city: 'Mumbai',
            pincode: '400001'
          };
          db.createPatientProfile(p);
        }
        setPatientProfile(p);
        setDoctorProfile(undefined);
        setHospitalAccount(undefined);
      } else if (currentUser.role === 'DOCTOR') {
        let d = db.getDoctorByUserId(currentUser.id);
        if (!d) {
          d = {
            id: `doc-${currentUser.id}`,
            userId: currentUser.id,
            registrationNumber: 'MCI-2026-ACTIVE',
            qualification: 'MBBS, MD',
            specialization: 'Internal & Emergency Medicine',
            hospitalId: 'hosp-001',
            hospitalName: 'Apex Super Speciality Hospital',
            departmentId: 'dept-001',
            departmentName: 'Emergency & Critical Care',
            experienceYears: 12,
            isAvailable: true,
            activePatientsCount: 3
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

      // Persist session
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ isAuthenticated: true, user: currentUser })
      );
    } else {
      setPatientProfile(undefined);
      setDoctorProfile(undefined);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [currentUser, isAuthenticated]);

  // Real Email/Patient ID & Password Login
  const login = async (identifier: string, password?: string): Promise<{ success: boolean; message?: string }> => {
    const cleanId = identifier.trim();
    if (!cleanId) {
      return { success: false, message: 'Please enter your registered Email or Patient ID.' };
    }

    const user = db.findUserByIdentifier(cleanId);

    if (!user) {
      return {
        success: false,
        message: `No registered account found for "${cleanId}". Please check your credentials or click 'Create Account' to register.`
      };
    }

    // Verify password if stored on account
    if (user.password && password) {
      if (user.password.trim() !== password.trim()) {
        return { success: false, message: 'Incorrect password. Please check your password and try again.' };
      }
    }

    // Load profile
    if (user.role === 'PATIENT') {
      const p = db.getPatientByUserId(user.id) || db.getPatientByPatientId(cleanId);
      if (p) setPatientProfile(p);
      setDoctorProfile(undefined);
      setHospitalAccount(undefined);
    } else if (user.role === 'DOCTOR') {
      const d = db.getDoctorByUserId(user.id);
      if (d) setDoctorProfile(d);
      setPatientProfile(undefined);
      setHospitalAccount(undefined);
    } else if (user.role === 'HOSPITAL_ADMIN') {
      const hacct = db.getHospitalAccountByUserId(user.id);
      setHospitalAccount(hacct || undefined);
      setPatientProfile(undefined);
      setDoctorProfile(undefined);
    } else {
      setHospitalAccount(undefined);
    }

    setCurrentUser(user);
    setIsAuthenticated(true);

    db.logAction(
      user.id,
      user.fullName,
      user.role,
      'LOGIN',
      'AuthSession',
      user.id,
      `User signed in successfully via: ${cleanId}`
    );

    return { success: true };
  };

  // Register New Patient with Unique Patient ID
  const registerPatient = async (data: RegisterPatientData): Promise<{ success: boolean; patientId?: string; message?: string }> => {
    const existing = db.findUserByEmail(data.email);
    if (existing) {
      return { success: false, message: 'An account with this email address already exists. Please sign in.' };
    }

    const userId = `usr-pat-${Date.now()}`;
    const generatedPatientId = db.generateUniquePatientId();

    const newUser: User = {
      id: userId,
      email: data.email.trim().toLowerCase(),
      password: data.password,
      phone: data.phone,
      fullName: data.fullName.trim(),
      role: 'PATIENT',
      createdAt: new Date().toISOString()
    };
    db.createUser(newUser);

    // Calculate age from DOB if given
    let calculatedAge = 35;
    if (data.dob) {
      const birthYear = new Date(data.dob).getFullYear();
      if (!isNaN(birthYear)) calculatedAge = new Date().getFullYear() - birthYear;
    }

    const newProfile: PatientProfile = {
      id: `pat-${Date.now()}`,
      userId: userId,
      patientId: generatedPatientId,
      abhaId: `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      abhaAddress: `${data.fullName.toLowerCase().replace(/\s+/g, '.') || 'patient'}@abdm`,
      dob: data.dob || '1990-01-01',
      age: calculatedAge,
      gender: data.gender,
      bloodGroup: data.bloodGroup || 'B+',
      emergencyContactName: data.emergencyContactName || 'Family Member',
      emergencyContactPhone: data.emergencyContactPhone || data.phone,
      emergencyContactRelation: data.emergencyContactRelation || 'Next of Kin',
      address: data.address || 'Registered Residential Address',
      city: data.city || 'Mumbai',
      pincode: data.pincode || '400001'
    };
    db.createPatientProfile(newProfile);

    // Set authenticated session
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
      `New patient account registered and issued Patient ID: ${generatedPatientId}`
    );

    return { success: true, patientId: generatedPatientId };
  };

  // Register New Staff / Doctor / Admin
  const registerStaff = async (data: RegisterStaffData): Promise<{ success: boolean; message?: string }> => {
    const existing = db.findUserByEmail(data.email);
    if (existing) {
      return { success: false, message: 'An account with this email address already exists.' };
    }

    const userId = `usr-staff-${Date.now()}`;
    const newUser: User = {
      id: userId,
      email: data.email.trim().toLowerCase(),
      password: data.password,
      phone: data.phone,
      fullName: data.fullName.trim(),
      role: data.role,
      createdAt: new Date().toISOString()
    };
    db.createUser(newUser);

    if (data.role === 'DOCTOR') {
      const newDoctor = {
        id: `doc-${Date.now()}`,
        userId: userId,
        registrationNumber: data.registrationNumber || `MCI-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        qualification: 'MBBS, MD',
        specialization: data.specialization || 'General & Emergency Medicine',
        hospitalId: data.hospitalId || 'hosp-001',
        hospitalName: data.hospitalName || 'Apex Super Speciality Hospital',
        departmentId: 'dept-001',
        departmentName: 'Emergency & Critical Care',
        experienceYears: 10,
        isAvailable: true,
        activePatientsCount: 0
      };
      db.createDoctorProfile(newDoctor);
      setDoctorProfile(newDoctor);
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
      `Staff registered with role: ${data.role}`
    );

    return { success: true };
  };

  // Register New Hospital (Portal Account & Shared Hospital Registry)
  const registerHospital = async (data: RegisterHospitalData): Promise<{ success: boolean; hospitalId?: string; message?: string }> => {
    const existing = db.findUserByEmail(data.email);
    if (existing) {
      return { success: false, message: 'A hospital account with this email already exists. Please sign in.' };
    }

    const userId = `usr-hosp-${Date.now()}`;
    const hospitalId = db.generateUniqueHospitalId(); // e.g. HOSP-2026-XXXXX

    // Resolve coordinates if not provided directly
    let coords = data.coordinates;
    if (!coords || (coords.lat === 0 && coords.lng === 0)) {
      const query = `${data.address} ${data.location} ${data.city} ${data.pincode || ''}`.trim();
      const geocoded = await LocationHospitalService.geocodeHospitalLocation(query);
      coords = { lat: geocoded.lat, lng: geocoded.lng };
    }

    const newUser: User = {
      id: userId,
      email: data.email.trim().toLowerCase(),
      password: data.password,
      phone: data.emergencyContact,
      fullName: data.hospitalName.trim(),
      role: 'HOSPITAL_ADMIN',
      createdAt: new Date().toISOString()
    };
    db.createUser(newUser);

    const newHospitalAccount: HospitalAccount = {
      id: hospitalId,
      userId: userId,
      hospitalName: data.hospitalName.trim(),
      registrationId: data.registrationId.trim(),
      address: data.address.trim(),
      city: data.city.trim(),
      location: data.location.trim(),
      emergencyContact: data.emergencyContact.trim(),
      email: data.email.trim().toLowerCase(),
      ambulanceAvailable: data.ambulanceAvailable,
      coordinates: coords,
      departments: data.departments || ['Emergency & Trauma', 'General Medicine', 'Cardiology', 'ICU'],
      linkedHospitalId: hospitalId,
      createdAt: new Date().toISOString()
    };
    db.createHospitalAccount(newHospitalAccount);

    setCurrentUser(newUser);
    setHospitalAccount(newHospitalAccount);
    setIsAuthenticated(true);

    db.logAction(
      newUser.id,
      newUser.fullName,
      'HOSPITAL_ADMIN',
      'LOGIN',
      'HospitalAccount',
      hospitalId,
      `Hospital registered: ${data.hospitalName} (Unique ID: ${hospitalId}, Reg: ${data.registrationId})`
    );

    return { success: true, hospitalId: hospitalId };
  };

  // Switch role while in active session
  const switchRole = (role: UserRole) => {
    const allUsers = db.getUsers();
    let targetUser = allUsers.find(u => u.role === role);
    if (!targetUser) {
      targetUser = {
        id: `usr-${role.toLowerCase()}-${Date.now()}`,
        email: `${role.toLowerCase()}@medibridge.ai`,
        phone: '+91 99999 00000',
        fullName: role === 'PATIENT' ? 'Registered Patient' : role === 'DOCTOR' ? 'Dr. Vikram Deshmukh, MD' : role === 'TRIAGE' ? 'Staff Nurse Sunita Rao (ER)' : 'Hospital Administrator',
        role: role,
        createdAt: new Date().toISOString()
      };
    }
    setCurrentUser(targetUser);
    setIsAuthenticated(true);
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
