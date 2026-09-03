import React, { useState } from 'react';
import {
  Activity, User as UserIcon, Stethoscope, Siren, ShieldAlert,
  Globe, Bell, ChevronDown, Check, Sparkles, HeartPulse, FileText,
  Clock, Info, LogOut, Menu, X, Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { UserRole, LanguageCode } from '../../types';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const { currentUser, currentRole, switchRole, patientProfile, doctorProfile, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { notifications, unreadCount, markAsRead } = useNotification();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const roles: { role: UserRole; label: string; icon: any; color: string; desc: string }[] = [
    { role: 'PATIENT', label: 'Patient Portal', icon: UserIcon, color: 'text-teal-600 bg-teal-50', desc: 'Home AI Intake & Health Records' },
    { role: 'DOCTOR', label: 'Physician Portal', icon: Stethoscope, color: 'text-blue-600 bg-blue-50', desc: 'Pre-arrival Queue & Verification' },
    { role: 'TRIAGE', label: 'Hospital Triage / ER', icon: Siren, color: 'text-red-600 bg-red-50', desc: 'Emergency Command & Ambulance' },
    { role: 'HOSPITAL_ADMIN', label: 'Hospital Portal', icon: Building2, color: 'text-indigo-600 bg-indigo-50', desc: 'Patient Intake & Bed Management' },
    { role: 'ADMIN', label: 'Platform Admin', icon: ShieldAlert, color: 'text-purple-600 bg-purple-50', desc: 'Live Database & Registered Accounts' },
  ];

  const languages: { code: LanguageCode; label: string; sub: string }[] = [
    { code: 'en', label: '🇬🇧 English', sub: 'English' },
    { code: 'hi', label: '🇮🇳 हिंदी', sub: 'Hindi' },
    { code: 'mr', label: '🇮🇳 मराठी', sub: 'Marathi' },
    { code: 'ur', label: '🇮🇳 اردو', sub: 'Urdu' },
    { code: 'kn', label: '🇮🇳 ಕನ್ನಡ', sub: 'Kannada' },
    { code: 'gu', label: '🇮🇳 ગુજરાતી', sub: 'Gujarati' },
    { code: 'ta', label: '🇮🇳 தமிழ்', sub: 'Tamil' },
    { code: 'bn', label: '🇮🇳 বাংলা', sub: 'Bengali' },
  ];

  const handleRoleSelect = (role: UserRole) => {
    switchRole(role);
    setShowRoleDropdown(false);
    setShowMobileMenu(false);
    if (role === 'PATIENT') onNavigate('patient-dashboard');
    else if (role === 'DOCTOR') onNavigate('doctor-dashboard');
    else if (role === 'TRIAGE') onNavigate('triage-dashboard');
    else if (role === 'HOSPITAL_ADMIN' || role === 'HOSPITAL') onNavigate('hospital-dashboard');
    else if (role === 'ADMIN' || role === 'SYSTEM_ADMIN') onNavigate('admin-dashboard');
  };

  const handleDashboardNavigate = () => {
    setShowMobileMenu(false);
    if (currentRole === 'PATIENT') onNavigate('patient-dashboard');
    else if (currentRole === 'DOCTOR') onNavigate('doctor-dashboard');
    else if (currentRole === 'TRIAGE') onNavigate('triage-dashboard');
    else if (currentRole === 'HOSPITAL' || currentRole === 'HOSPITAL_ADMIN') onNavigate('hospital-dashboard');
    else onNavigate('admin-dashboard');
  };

  return (
    <nav className="bg-white/95 border-b border-slate-200 sticky top-0 z-30 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Main Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleDashboardNavigate}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-md shadow-teal-600/20">
              <HeartPulse className="w-6 h-6 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-slate-900 tracking-tight">MediBridge</span>
                <span className="text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.2 rounded uppercase">
                  AI Clinical
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
                Home-to-Hospital Intake & Triage
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
            <button
              onClick={handleDashboardNavigate}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 text-white shadow-sm hover:bg-teal-700 transition"
            >
              Clinical Dashboard
            </button>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 transition"
                title="Select Language"
              >
                <Globe className="w-3.5 h-3.5 text-teal-600" />
                <span className="uppercase font-bold text-[11px]">{language}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showLangDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 animate-fadeIn">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                    Select Language
                  </div>
                  {languages.map(l => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code);
                        setShowLangDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-teal-50 text-slate-700 hover:text-teal-900 transition"
                    >
                      <span className="font-medium">{l.label}</span>
                      {language === l.code && <Check className="w-3.5 h-3.5 text-teal-600 font-bold" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-700 transition"
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-slate-700" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-2xl p-3 z-50 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">Real-Time Clinical Alerts</span>
                    <span className="text-[10px] text-teal-600 font-semibold">{notifications.length} Total</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 mt-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">No active alerts</p>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markAsRead(n.id);
                            if (n.actionUrl) {
                              if (n.actionUrl.includes('doctor')) onNavigate('doctor-dashboard');
                              else if (n.actionUrl.includes('triage')) onNavigate('triage-dashboard');
                              setShowNotifDropdown(false);
                            }
                          }}
                          className={`p-2.5 rounded-lg cursor-pointer transition ${
                            n.isRead ? 'opacity-60 bg-transparent' : 'bg-slate-50'
                          } hover:bg-teal-50/50`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-semibold">
                            <span className={n.type === 'EMERGENCY' ? 'text-red-600 font-bold' : 'text-teal-700'}>
                              {n.title}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill & Role Switcher (Desktop) */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-800 transition"
              >
                <div className="w-2 h-2 rounded-full bg-teal-500" />
                <div className="text-left">
                  <p className="text-[11px] font-bold text-slate-900 line-clamp-1">
                    {currentUser?.fullName || 'User'}
                  </p>
                  <p className="text-[9px] text-teal-700 font-mono font-semibold">
                    {currentRole === 'PATIENT' ? (patientProfile?.patientId || 'Patient') : currentRole}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Signed In User</p>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">{currentUser?.fullName}</p>
                    <p className="text-[10px] text-teal-700 font-mono font-semibold mt-0.5">
                      {currentRole === 'PATIENT' && `Patient ID: ${patientProfile?.patientId || 'Assigned'}`}
                      {currentRole === 'DOCTOR' && `Doctor Reg: ${doctorProfile?.registrationNumber || 'MCI-Verified'}`}
                      {currentRole === 'TRIAGE' && 'ER Resuscitation Desk'}
                      {currentRole === 'HOSPITAL_ADMIN' && 'System Administrator'}
                    </p>
                  </div>

                  <div className="py-1 space-y-1">
                    <p className="text-[9px] text-slate-400 uppercase tracking-wider px-3 pt-1 font-bold">Switch View / Persona</p>
                    {roles.map(r => {
                      const Icon = r.icon;
                      const isCurrent = r.role === currentRole;
                      return (
                        <button
                          key={r.role}
                          onClick={() => handleRoleSelect(r.role)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-3 transition ${
                            isCurrent ? 'bg-teal-50 border border-teal-200 text-teal-900' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg ${r.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold flex items-center justify-between text-slate-900">
                              <span>{r.label}</span>
                              {isCurrent && <Check className="w-3.5 h-3.5 text-teal-600" />}
                            </div>
                            <p className="text-[10px] text-slate-500 line-clamp-1">{r.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-slate-100 mt-1">
                    <button
                      onClick={() => {
                        setShowRoleDropdown(false);
                        logout();
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center justify-center gap-2 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out of MediBridge</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Standalone Quick Logout Button (Desktop) */}
            <button
              onClick={logout}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 border border-slate-200 hover:border-red-200 transition"
              title="Secure Logout"
            >
              <LogOut className="w-3.5 h-3.5 text-red-500" />
              <span>Log Out</span>
            </button>

            {/* Mobile Hamburger Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="sm:hidden p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
              aria-label="Toggle navigation menu"
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer / Menu */}
      {showMobileMenu && (
        <div className="sm:hidden bg-white border-b border-slate-200 p-4 space-y-4 shadow-xl animate-fadeIn">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900">{currentUser?.fullName || 'Registered User'}</p>
              <p className="text-[10px] text-teal-700 font-mono font-semibold">{currentRole}</p>
            </div>
            <button
              onClick={logout}
              className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              <span>Logout</span>
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Switch Portal / Persona</p>
            <div className="grid grid-cols-2 gap-2">
              {roles.map(r => {
                const Icon = r.icon;
                const isCurrent = r.role === currentRole;
                return (
                  <button
                    key={r.role}
                    onClick={() => handleRoleSelect(r.role)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center gap-2 transition ${
                      isCurrent ? 'bg-teal-50 border-teal-300 text-teal-900' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{r.label.replace(' Portal', '')}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
