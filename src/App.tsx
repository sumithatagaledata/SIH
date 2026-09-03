import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { LoginPage } from './pages/public/LoginPage';
import { PatientDashboard } from './pages/patient/PatientDashboard';
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { TriageDashboard } from './pages/triage/TriageDashboard';
import { HospitalDashboard } from './pages/hospital/HospitalDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';

const AppContent: React.FC = () => {
  const { isAuthenticated, currentRole } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');

  // When role or auth status changes, redirect to appropriate role dashboard
  useEffect(() => {
    if (isAuthenticated) {
      if (currentRole === 'PATIENT') setCurrentPage('patient-dashboard');
      else if (currentRole === 'DOCTOR') setCurrentPage('doctor-dashboard');
      else if (currentRole === 'TRIAGE') setCurrentPage('triage-dashboard');
      else if (currentRole === 'HOSPITAL' || currentRole === 'HOSPITAL_ADMIN') setCurrentPage('hospital-dashboard');
      else if (currentRole === 'ADMIN' || currentRole === 'SYSTEM_ADMIN') setCurrentPage('admin-dashboard');
    } else {
      setCurrentPage('login');
    }
  }, [isAuthenticated, currentRole]);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // STRICT AUTHENTICATION GATE:
  // If user is not authenticated, show ONLY the Login / Registration Gateway
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center font-sans selection:bg-teal-500 selection:text-white">
        <LoginPage onNavigate={handleNavigate} />
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'patient-dashboard':
        return <PatientDashboard />;
      case 'doctor-dashboard':
        return <DoctorDashboard />;
      case 'triage-dashboard':
        return <TriageDashboard />;
      case 'hospital-dashboard':
        return <HospitalDashboard />;
      case 'admin-dashboard':
        return <AdminDashboard />;
      default:
        if (currentRole === 'PATIENT') return <PatientDashboard />;
        if (currentRole === 'DOCTOR') return <DoctorDashboard />;
        if (currentRole === 'TRIAGE') return <TriageDashboard />;
        if (currentRole === 'HOSPITAL' || currentRole === 'HOSPITAL_ADMIN') return <HospitalDashboard />;
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Main Global Navigation with Active User & Logout */}
      <Navbar currentPage={currentPage} onNavigate={handleNavigate} />

      {/* Protected Viewport */}
      <main className="flex-1">
        {renderPage()}
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;

