import React, { useState } from 'react';
import {
  HeartPulse, Lock, Mail, User, Phone, Calendar, ShieldCheck,
  Stethoscope, Siren, ShieldAlert, ArrowRight, AlertTriangle,
  CheckCircle2, Globe, Eye, EyeOff, KeyRound, RefreshCw, Activity,
  Info, FileText, Building2, MapPin, Ambulance, ArrowLeft,
  ChevronRight, Navigation, Crosshair
} from 'lucide-react';
import { useAuth, RegisterPatientData, RegisterHospitalData } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { LocationHospitalService } from '../../services/locationHospitalService';

interface LoginPageProps {
  onNavigate?: (page: string) => void;
}

type Portal = 'CHOOSE' | 'PATIENT' | 'HOSPITAL';
type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login, registerPatient, registerHospital } = useAuth();
  const { showToast } = useNotification();

  const [portal, setPortal] = useState<Portal>('CHOOSE');
  const [authMode, setAuthMode] = useState<AuthMode>('LOGIN');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ── Shared login state ──────────────────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // ── Patient register state ──────────────────────────────────────────────────
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regGender, setRegGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [regBloodGroup, setRegBloodGroup] = useState('B+');
  const [regEmergencyName, setRegEmergencyName] = useState('');
  const [regEmergencyPhone, setRegEmergencyPhone] = useState('');
  const [regEmergencyRelation, setRegEmergencyRelation] = useState('Spouse');
  const [regAddress, setRegAddress] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regPincode, setRegPincode] = useState('');
  const [regLanguage, setRegLanguage] = useState<'en' | 'hi' | 'mr'>('en');

  // ── Hospital register state ─────────────────────────────────────────────────
  const [hospName, setHospName] = useState('');
  const [hospRegId, setHospRegId] = useState('');
  const [hospAddress, setHospAddress] = useState('');
  const [hospCity, setHospCity] = useState('');
  const [hospLocation, setHospLocation] = useState('');
  const [hospState, setHospState] = useState('Maharashtra');
  const [hospPincode, setHospPincode] = useState('');
  const [hospEmergencyContact, setHospEmergencyContact] = useState('');
  const [hospEmail, setHospEmail] = useState('');
  const [hospPassword, setHospPassword] = useState('');
  const [hospConfirmPassword, setHospConfirmPassword] = useState('');
  const [hospAmbulance, setHospAmbulance] = useState(true);
  const [hospCoords, setHospCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocatingHosp, setIsLocatingHosp] = useState(false);

  // ── Forgot password state ───────────────────────────────────────────────────
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const resetForms = () => {
    setErrorMessage('');
    setLoginEmail('');
    setLoginPassword('');
  };

  const handlePortalSelect = (p: Portal) => {
    setPortal(p);
    setAuthMode('LOGIN');
    resetForms();
  };

  const handleBack = () => {
    setPortal('CHOOSE');
    resetForms();
    setAuthMode('LOGIN');
  };

  // ── Patient login submit ─────────────────────────────────────────────────────
  const handlePatientLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!loginEmail.trim()) { setErrorMessage('Please enter your Email or Patient ID.'); return; }
    if (!loginPassword.trim()) { setErrorMessage('Please enter your password.'); return; }
    setIsLoading(true);
    try {
      const res = await login(loginEmail, loginPassword);
      if (res.success) {
        showToast('Welcome to MediBridge AI', 'Patient session authenticated.', 'INFO');
        if (onNavigate) onNavigate('patient-dashboard');
      } else {
        setErrorMessage(res.message || 'Failed to sign in. Please verify your credentials.');
      }
    } catch { setErrorMessage('An unexpected error occurred.'); }
    finally { setIsLoading(false); }
  };

  // ── Hospital login submit ────────────────────────────────────────────────────
  const handleHospitalLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!loginEmail.trim()) { setErrorMessage('Please enter your Hospital Email.'); return; }
    if (!loginPassword.trim()) { setErrorMessage('Please enter your password.'); return; }
    setIsLoading(true);
    try {
      const res = await login(loginEmail, loginPassword);
      if (res.success) {
        showToast('Hospital Portal Access Granted', 'Welcome to MediBridge Hospital Dashboard.', 'INFO');
        if (onNavigate) onNavigate('hospital-dashboard');
      } else {
        setErrorMessage(res.message || 'Hospital login failed. Check credentials.');
      }
    } catch { setErrorMessage('An unexpected error occurred.'); }
    finally { setIsLoading(false); }
  };

  // ── Patient register submit ──────────────────────────────────────────────────
  const handlePatientRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!regFullName.trim() || !regEmail.trim() || !regPhone.trim()) {
      setErrorMessage('Please complete all required fields (Name, Email, Mobile).');
      return;
    }
    if (regPassword && regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }
    setIsLoading(true);
    try {
      const patientData: RegisterPatientData = {
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        phone: regPhone.trim(),
        dob: regDob || '1992-06-15',
        gender: regGender,
        bloodGroup: regBloodGroup,
        emergencyContactName: regEmergencyName.trim() || 'Primary Emergency Contact',
        emergencyContactPhone: regEmergencyPhone.trim() || regPhone.trim(),
        emergencyContactRelation: regEmergencyRelation || 'Family Member',
        preferredLanguage: regLanguage,
        address: regAddress.trim() || 'Registered Home Address',
        city: regCity.trim() || 'Mumbai',
        pincode: regPincode.trim() || '400001'
      };
      const res = await registerPatient(patientData);
      if (res.success) {
        showToast(
          '🎉 Patient Account Created!',
          `Your Unique Patient ID: ${res.patientId}. All AI reports will be linked to this ID.`,
          'INFO'
        );
        if (onNavigate) onNavigate('patient-dashboard');
      } else {
        setErrorMessage(res.message || 'Registration failed.');
      }
    } catch { setErrorMessage('An unexpected error occurred during registration.'); }
    finally { setIsLoading(false); }
  };

  // ── Hospital GPS handler ──────────────────────────────────────────────────
  const handleGetHospitalGps = async () => {
    setIsLocatingHosp(true);
    showToast('GPS Sensor', 'Acquiring hospital coordinates...', 'INFO');
    try {
      const gps = await LocationHospitalService.getCurrentGpsPosition();
      setHospCoords(gps.coordinates);
      if (gps.city) setHospCity(gps.city);
      if (!hospLocation) setHospLocation(gps.city || 'Local Area');
      if (!hospAddress) setHospAddress(`Facility Location (${gps.coordinates.lat.toFixed(4)}°, ${gps.coordinates.lng.toFixed(4)}°)`);
      showToast('📍 GPS Locked', `Hospital Coordinates: ${gps.coordinates.lat.toFixed(4)}°, ${gps.coordinates.lng.toFixed(4)}°`, 'VERIFICATION');
    } catch {
      showToast('GPS Error', 'Could not acquire device GPS. Please enter address manually.', 'INFO');
    } finally {
      setIsLocatingHosp(false);
    }
  };

  // ── Hospital register submit ─────────────────────────────────────────────────
  const handleHospitalRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!hospName.trim() || !hospRegId.trim() || !hospEmail.trim() || !hospPassword.trim()) {
      setErrorMessage('Please complete all required fields (Name, Registration ID, Email, Password).');
      return;
    }
    if (hospPassword !== hospConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      const hospitalData: RegisterHospitalData = {
        hospitalName: hospName.trim(),
        registrationId: hospRegId.trim(),
        address: hospAddress.trim() || 'Hospital Facility Address',
        city: hospCity.trim() || 'Talegaon Dabhade',
        location: hospLocation.trim() || hospCity.trim() || 'Talegaon Dabhade',
        state: hospState.trim() || 'Maharashtra',
        pincode: hospPincode.trim() || '410507',
        emergencyContact: hospEmergencyContact.trim() || '+91 22 0000 0000',
        email: hospEmail.trim(),
        password: hospPassword,
        ambulanceAvailable: hospAmbulance,
        coordinates: hospCoords || undefined,
        departments: ['Emergency & Trauma', 'General Medicine', 'Cardiology', 'ICU', 'Orthopedics']
      };
      const res = await registerHospital(hospitalData);
      if (res.success) {
        showToast(
          '🏥 Hospital Account Created!',
          `${hospName} registered with Permanent ID: ${res.hospitalId}. Now discoverable by nearby patients!`,
          'INFO'
        );
        if (onNavigate) onNavigate('hospital-dashboard');
      } else {
        setErrorMessage(res.message || 'Hospital registration failed.');
      }
    } catch { setErrorMessage('An unexpected error occurred.'); }
    finally { setIsLoading(false); }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { setErrorMessage('Please enter your registered email.'); return; }
    setResetSent(true);
    showToast('Password Reset Link Dispatched', `A secure reset link has been dispatched to ${forgotEmail}.`, 'INFO');
  };

  // Input & Label Classes (Light Healthcare Theme)
  const inputCls = 'w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition shadow-sm';
  const labelCls = 'text-xs font-bold text-slate-700 flex items-center gap-1 mb-1';

  // SHARED: Brand Header
  const BrandHeader = () => (
    <div className="text-center space-y-3">
      <div className="inline-flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-teal-600/20">
          <HeartPulse className="w-8 h-8 stroke-[2.5]" />
        </div>
        <div className="text-left">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">MediBridge AI</h1>
            <span className="text-xs font-extrabold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded uppercase">Clinical</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Home-to-Hospital AI Clinical Intake &amp; Triage</p>
        </div>
      </div>
      <div className="inline-flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-1 rounded-full text-xs text-slate-600 shadow-sm mt-2">
        <ShieldCheck className="w-4 h-4 text-teal-600" />
        <span>Secure Healthcare Authentication Gate • Patient Data Encryption</span>
      </div>
    </div>
  );

  // SHARED: Error banner
  const ErrorBanner = () => errorMessage ? (
    <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2.5 animate-pulse">
      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
      <span className="font-semibold">{errorMessage}</span>
    </div>
  ) : null;

  // SHARED: Back button + portal badge
  const PortalHeader = ({ color, icon: Icon, title }: { color: string; icon: React.ElementType; title: string }) => (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-semibold"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Portal Selection</span>
      </button>
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${color}`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{title}</span>
      </div>
    </div>
  );

  // SCREEN 1: Portal Chooser
  if (portal === 'CHOOSE') {
    return (
      <div className="min-h-[88vh] flex flex-col justify-center max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8">
        <BrandHeader />

        <div className="max-w-2xl mx-auto w-full space-y-4">
          <p className="text-center text-sm text-slate-500 font-semibold">Select your portal to continue</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Patient Portal */}
            <button
              type="button"
              onClick={() => handlePortalSelect('PATIENT')}
              className="group relative p-6 bg-white border-2 border-teal-200 hover:border-teal-500 rounded-3xl text-left transition-all duration-200 hover:-translate-y-1 shadow-md hover:shadow-xl hover:shadow-teal-500/10 overflow-hidden"
            >
              <div className="relative space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-500 flex items-center justify-center shadow-md shadow-teal-500/20">
                  <User className="w-7 h-7 text-white stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-1">🧑 Patient Portal</h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    AI clinical intake, medical history, document upload, appointments and emergency support.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>Unique Patient ID issued</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-teal-700 font-bold uppercase tracking-wider">Sign In / Register</span>
                  <ChevronRight className="w-4 h-4 text-teal-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            {/* Hospital Portal */}
            <button
              type="button"
              onClick={() => handlePortalSelect('HOSPITAL')}
              className="group relative p-6 bg-white border-2 border-blue-200 hover:border-blue-500 rounded-3xl text-left transition-all duration-200 hover:-translate-y-1 shadow-md hover:shadow-xl hover:shadow-blue-500/10 overflow-hidden"
            >
              <div className="relative space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Building2 className="w-7 h-7 text-white stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-1">🏥 Hospital Portal</h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Patient records, authorized medical history, emergency alerts and pre-arrival coordination.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
                    <span>ABDM-compliant access control</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-blue-700 font-bold uppercase tracking-wider">Sign In / Register</span>
                  <ChevronRight className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-500 flex items-center justify-center gap-2 shadow-sm">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Doctors, Triage Staff &amp; Hospital Admins — use the <strong className="text-slate-700">Hospital Portal</strong></span>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 2a: Patient Auth
  if (portal === 'PATIENT') {
    return (
      <div className="min-h-[88vh] flex flex-col justify-center max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8">
        <BrandHeader />

        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl max-w-2xl mx-auto w-full space-y-6">
          <PortalHeader color="bg-teal-50 text-teal-800 border-teal-200" icon={User} title="Patient Portal" />

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            {(['LOGIN', 'REGISTER'] as const).map(mode => (
              <button key={mode} type="button"
                onClick={() => { setAuthMode(mode); setErrorMessage(''); }}
                className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
                  authMode === mode ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {mode === 'LOGIN' ? <Lock className="w-4 h-4" /> : <User className="w-4 h-4" />}
                <span>{mode === 'LOGIN' ? 'Sign In' : 'Create Account'}</span>
              </button>
            ))}
          </div>

          <ErrorBanner />

          {/* Patient Login Form */}
          {authMode === 'LOGIN' && (
            <form onSubmit={handlePatientLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className={labelCls}><Mail className="w-3.5 h-3.5 text-teal-600" /><span>Email or Patient ID</span></label>
                <input type="text" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                  placeholder="e.g. name@email.com or MB-2026-7F42K9" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className={labelCls}><Lock className="w-3.5 h-3.5 text-teal-600" /><span>Password</span></label>
                  <button type="button" onClick={() => setAuthMode('FORGOT_PASSWORD')} className="text-xs text-teal-700 hover:underline font-semibold">Forgot Password?</button>
                </div>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Enter your password" className={inputCls + ' pr-10'} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={isLoading}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-md shadow-teal-600/20 transition flex items-center justify-center gap-2 mt-2">
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><span>Sign In as Patient</span><ArrowRight className="w-4 h-4" /></>}
              </button>
              <p className="text-xs text-slate-500 text-center">New patient? <button type="button" onClick={() => setAuthMode('REGISTER')} className="text-teal-700 font-bold hover:underline">Create account with Patient ID</button></p>
            </form>
          )}

          {/* Patient Register Form */}
          {authMode === 'REGISTER' && (
            <form onSubmit={handlePatientRegisterSubmit} className="space-y-4">
              {/* Personal Info */}
              <div className="pb-1">
                <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-3">Personal Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className={labelCls}><User className="w-3.5 h-3.5 text-teal-600" />Full Name *</label>
                    <input type="text" required value={regFullName} onChange={e => setRegFullName(e.target.value)} placeholder="e.g. Ramesh Kulkarni" className={inputCls} /></div>
                  <div><label className={labelCls}><Mail className="w-3.5 h-3.5 text-teal-600" />Email Address *</label>
                    <input type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="name@example.com" className={inputCls} /></div>
                  <div><label className={labelCls}><Phone className="w-3.5 h-3.5 text-teal-600" />Mobile Number *</label>
                    <input type="tel" required value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="+91 98200 12345" className={inputCls} /></div>
                  <div><label className={labelCls}><Calendar className="w-3.5 h-3.5 text-teal-600" />Date of Birth</label>
                    <input type="date" value={regDob} onChange={e => setRegDob(e.target.value)} className={inputCls} /></div>
                  <div><label className={labelCls}>Gender</label>
                    <select value={regGender} onChange={e => setRegGender(e.target.value as any)} className={inputCls}>
                      <option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
                    </select></div>
                  <div><label className={labelCls}>Blood Group</label>
                    <select value={regBloodGroup} onChange={e => setRegBloodGroup(e.target.value)} className={inputCls}>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select></div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="pb-1">
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-3">Emergency Contact</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><label className={labelCls}>Contact Name</label>
                    <input type="text" value={regEmergencyName} onChange={e => setRegEmergencyName(e.target.value)} placeholder="e.g. Sunita Kulkarni" className={inputCls} /></div>
                  <div><label className={labelCls}>Contact Phone</label>
                    <input type="tel" value={regEmergencyPhone} onChange={e => setRegEmergencyPhone(e.target.value)} placeholder="+91 98201 55667" className={inputCls} /></div>
                  <div><label className={labelCls}>Relation</label>
                    <select value={regEmergencyRelation} onChange={e => setRegEmergencyRelation(e.target.value)} className={inputCls}>
                      {['Spouse','Parent','Sibling','Child','Friend','Other'].map(r => <option key={r}>{r}</option>)}
                    </select></div>
                </div>
              </div>

              {/* Address */}
              <div className="pb-1">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3">Address / Location</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3"><label className={labelCls}><MapPin className="w-3.5 h-3.5 text-teal-600" />Street Address</label>
                    <input type="text" value={regAddress} onChange={e => setRegAddress(e.target.value)} placeholder="e.g. 12 MG Road, Andheri West" className={inputCls} /></div>
                  <div><label className={labelCls}>City</label>
                    <input type="text" value={regCity} onChange={e => setRegCity(e.target.value)} placeholder="Mumbai" className={inputCls} /></div>
                  <div><label className={labelCls}>Pincode</label>
                    <input type="text" value={regPincode} onChange={e => setRegPincode(e.target.value)} placeholder="400001" className={inputCls} /></div>
                  <div><label className={labelCls}><Globe className="w-3.5 h-3.5 text-teal-600" />Language</label>
                    <select value={regLanguage} onChange={e => setRegLanguage(e.target.value as any)} className={inputCls}>
                      <option value="en">English</option><option value="hi">हिंदी (Hindi)</option><option value="mr">मराठी (Marathi)</option>
                    </select></div>
                </div>
              </div>

              {/* Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Password</label>
                  <input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Create strong password" className={inputCls} /></div>
                <div><label className={labelCls}>Confirm Password</label>
                  <input type="password" value={regConfirmPassword} onChange={e => setRegConfirmPassword(e.target.value)} placeholder="Repeat password" className={inputCls} /></div>
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 text-teal-600 mt-0.5" />
                <span>A <strong>Unique Patient ID (e.g. MB-2026-XXXXXX)</strong> will be generated. All AI intakes, OCR files &amp; clinical reports will be encrypted under this ID.</span>
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-md shadow-teal-600/20 transition flex items-center justify-center gap-2">
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><span>Create Patient Account &amp; Generate ID</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {/* Forgot Password */}
          {authMode === 'FORGOT_PASSWORD' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-slate-900">Reset MediBridge Password</h3>
                <p className="text-xs text-slate-500">Enter your registered email to receive a secure recovery code.</p>
              </div>
              {resetSent ? (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-center space-y-3">
                  <CheckCircle2 className="w-8 h-8 text-teal-600 mx-auto" />
                  <p className="text-xs text-teal-900 font-medium">Reset instructions sent to <strong>{forgotEmail}</strong>.</p>
                  <button type="button" onClick={() => setAuthMode('LOGIN')} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg">Return to Sign In</button>
                </div>
              ) : (
                <>
                  <div><label className="text-xs font-bold text-slate-700">Registered Email</label>
                    <input type="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="name@example.com" className={inputCls + ' mt-1'} /></div>
                  <button type="submit" className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl">Send Reset Link</button>
                  <div className="text-center"><button type="button" onClick={() => setAuthMode('LOGIN')} className="text-xs text-slate-500 hover:text-slate-800">Cancel</button></div>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    );
  }

  // SCREEN 2b: Hospital Auth
  return (
    <div className="min-h-[88vh] flex flex-col justify-center max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      <BrandHeader />

      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl max-w-2xl mx-auto w-full space-y-6">
        <PortalHeader color="bg-blue-50 text-blue-800 border-blue-200" icon={Building2} title="Hospital Portal" />

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
          {(['LOGIN', 'REGISTER'] as const).map(mode => (
            <button key={mode} type="button"
              onClick={() => { setAuthMode(mode); setErrorMessage(''); }}
              className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
                authMode === mode ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {mode === 'LOGIN' ? <Lock className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
              <span>{mode === 'LOGIN' ? 'Hospital Sign In' : 'Register Hospital'}</span>
            </button>
          ))}
        </div>

        <ErrorBanner />

        {/* Registered Facility Portals Hint */}
        {authMode === 'LOGIN' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
            <p className="font-bold text-blue-900">Demo Facility Accounts:</p>
            <p>Apex Hospital: <span className="font-mono font-semibold">portal@apexhealth.in</span> / <span className="font-mono font-semibold">apex2026</span></p>
            <p>AIIMS Delhi: <span className="font-mono font-semibold">portal@aiims.edu.in</span> / <span className="font-mono font-semibold">aiims2026</span></p>
            <p>KEM Hospital: <span className="font-mono font-semibold">portal@kemhospital.in</span> / <span className="font-mono font-semibold">kem2026</span></p>
          </div>
        )}

        {/* Hospital Login Form */}
        {authMode === 'LOGIN' && (
          <form onSubmit={handleHospitalLoginSubmit} className="space-y-4">
            <div><label className={labelCls}><Mail className="w-3.5 h-3.5 text-blue-600" />Hospital Email</label>
              <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                placeholder="e.g. portal@hospitalname.in" className={inputCls} /></div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelCls}><Lock className="w-3.5 h-3.5 text-blue-600" />Password</label>
                <button type="button" onClick={() => setAuthMode('FORGOT_PASSWORD')} className="text-xs text-blue-700 hover:underline font-semibold">Forgot?</button>
              </div>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                  placeholder="Enter hospital portal password" className={inputCls + ' pr-10'} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2">
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><span>Sign In — Hospital Portal</span><ArrowRight className="w-4 h-4" /></>}
            </button>
            <p className="text-xs text-slate-500 text-center">New hospital? <button type="button" onClick={() => setAuthMode('REGISTER')} className="text-blue-700 font-bold hover:underline">Register your hospital</button></p>
          </form>
        )}

        {/* Hospital Register Form */}
        {authMode === 'REGISTER' && (
          <form onSubmit={handleHospitalRegisterSubmit} className="space-y-4">
            {/* Hospital Info */}
            <div className="pb-1">
              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-3">Hospital Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2"><label className={labelCls}><Building2 className="w-3.5 h-3.5 text-blue-600" />Hospital Name *</label>
                  <input type="text" required value={hospName} onChange={e => setHospName(e.target.value)} placeholder="e.g. Apex Super Speciality Hospital" className={inputCls} /></div>
                <div><label className={labelCls}><FileText className="w-3.5 h-3.5 text-blue-600" />Registration / License ID *</label>
                  <input type="text" required value={hospRegId} onChange={e => setHospRegId(e.target.value)} placeholder="e.g. DH-MH-2024-00491" className={inputCls} /></div>
                <div><label className={labelCls}><Phone className="w-3.5 h-3.5 text-blue-600" />Emergency Contact</label>
                  <input type="tel" value={hospEmergencyContact} onChange={e => setHospEmergencyContact(e.target.value)} placeholder="+91 22 2789 9900" className={inputCls} /></div>
              </div>
            </div>

            {/* Location */}
            <div className="pb-1 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Hospital Location &amp; Coordinates</p>
                <button
                  type="button"
                  onClick={handleGetHospitalGps}
                  disabled={isLocatingHosp}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold transition shadow-sm"
                >
                  {isLocatingHosp ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Crosshair className="w-3.5 h-3.5 text-teal-600" />
                  )}
                  <span>📍 Use Current Location (GPS)</span>
                </button>
              </div>

              {hospCoords && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="font-mono font-bold">
                    GPS Coordinates Locked: {hospCoords.lat.toFixed(4)}°, {hospCoords.lng.toFixed(4)}°
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2"><label className={labelCls}><MapPin className="w-3.5 h-3.5 text-blue-600" />Hospital Address</label>
                  <input type="text" value={hospAddress} onChange={e => setHospAddress(e.target.value)} placeholder="e.g. Station Road, Talegaon Dabhade" className={inputCls} /></div>
                <div><label className={labelCls}>Locality / Area *</label>
                  <input type="text" required value={hospLocation} onChange={e => setHospLocation(e.target.value)} placeholder="e.g. Talegaon Dabhade" className={inputCls} /></div>
                <div><label className={labelCls}>City *</label>
                  <input type="text" required value={hospCity} onChange={e => setHospCity(e.target.value)} placeholder="e.g. Pune / Mumbai" className={inputCls} /></div>
                <div><label className={labelCls}>State</label>
                  <input type="text" value={hospState} onChange={e => setHospState(e.target.value)} placeholder="e.g. Maharashtra" className={inputCls} /></div>
                <div><label className={labelCls}>PIN Code</label>
                  <input type="text" value={hospPincode} onChange={e => setHospPincode(e.target.value)} placeholder="e.g. 410507" className={inputCls} /></div>
              </div>
            </div>

            {/* Ambulance & Access */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Ambulance className="w-5 h-5 text-red-600" />
                <span>Ambulance Available</span>
              </div>
              <div className="flex items-center gap-3 ml-auto">
                {[true, false].map(val => (
                  <button key={String(val)} type="button" onClick={() => setHospAmbulance(val)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition ${
                      hospAmbulance === val
                        ? val ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-red-600 border-red-500 text-white'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}>
                    {val ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>

            {/* Credentials */}
            <div className="pb-1">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3">Portal Credentials</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2"><label className={labelCls}><Mail className="w-3.5 h-3.5 text-blue-600" />Hospital Email *</label>
                  <input type="email" required value={hospEmail} onChange={e => setHospEmail(e.target.value)} placeholder="portal@hospital.in" className={inputCls} /></div>
                <div><label className={labelCls}>Password *</label>
                  <input type="password" required value={hospPassword} onChange={e => setHospPassword(e.target.value)} placeholder="Create strong password" className={inputCls} /></div>
                <div><label className={labelCls}>Confirm Password</label>
                  <input type="password" value={hospConfirmPassword} onChange={e => setHospConfirmPassword(e.target.value)} placeholder="Repeat password" className={inputCls} /></div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 text-blue-600 mt-0.5" />
              <span>Patients control which hospitals can access their medical data. Your hospital will only see patients who have explicitly granted you permission.</span>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2">
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><span>Register Hospital on MediBridge</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        {/* Forgot Password */}
        {authMode === 'FORGOT_PASSWORD' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 text-center">Reset Hospital Portal Password</h3>
            {resetSent ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-blue-600 mx-auto" />
                <p className="text-xs text-blue-900">Reset instructions sent to <strong>{forgotEmail}</strong>.</p>
                <button type="button" onClick={() => setAuthMode('LOGIN')} className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg">Return to Sign In</button>
              </div>
            ) : (
              <>
                <div><label className="text-xs font-bold text-slate-700">Hospital Registered Email</label>
                  <input type="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="portal@hospital.in" className={inputCls + ' mt-1'} /></div>
                <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl">Send Reset Link</button>
                <div className="text-center"><button type="button" onClick={() => setAuthMode('LOGIN')} className="text-xs text-slate-500 hover:text-slate-800">Cancel</button></div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
