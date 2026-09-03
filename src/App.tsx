import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { LoginPage } from './pages/public/LoginPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { PatientDashboard } from './pages/patient/PatientDashboard';
import { HospitalDashboard } from './pages/hospital/HospitalDashboard';
import { AdminDashboard } from './pages/admin/AdminDashboard';

// Helper to determine canonical dashboard route for an authenticated role
const getAuthorizedDashboardRoute = (role: string | null): string => {
  if (role === 'PATIENT') return '/patient/dashboard';
  if (role === 'ADMIN' || role === 'SYSTEM_ADMIN') return '/admin/dashboard';
  if (role === 'HOSPITAL' || role === 'HOSPITAL_ADMIN' || role === 'DOCTOR' || role === 'TRIAGE') return '/hospital/dashboard';
  return '/login';
};

// Helper to normalize any path
const normalizePath = (path: string): string => {
  const clean = path.toLowerCase().replace(/\/$/, '') || '/';
  return clean;
};

const AppContent: React.FC = () => {
  const { isAuthenticated, currentRole } = useAuth();
  const { showToast } = useNotification();
  const [currentPath, setCurrentPath] = useState<string>(() => normalizePath(window.location.pathname));

  // Sync state with browser popstate (back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Strict Role-Based Route Protection & URL synchronization
  useEffect(() => {
    const activePath = normalizePath(window.location.pathname);

    if (!isAuthenticated) {
      // Allow unauthenticated routes to render their dedicated login screens
      if (
        !activePath.startsWith('/admin') &&
        !activePath.startsWith('/hospital') &&
        !activePath.startsWith('/patient') &&
        activePath !== '/login' &&
        activePath !== '/'
      ) {
        window.history.replaceState({}, '', '/login');
        setCurrentPath('/login');
      }
    } else {
      const authorizedDashboard = getAuthorizedDashboardRoute(currentRole);

      // Check if user is attempting to access an unauthorized portal
      const isAuthorized =
        (currentRole === 'PATIENT' && activePath.startsWith('/patient')) ||
        ((currentRole === 'ADMIN' || currentRole === 'SYSTEM_ADMIN') && activePath.startsWith('/admin')) ||
        ((currentRole === 'HOSPITAL' || currentRole === 'HOSPITAL_ADMIN' || currentRole === 'DOCTOR' || currentRole === 'TRIAGE') && activePath.startsWith('/hospital'));

      if (!isAuthorized) {
        if (
          activePath.startsWith('/admin') ||
          activePath.startsWith('/hospital') ||
          activePath.startsWith('/patient')
        ) {
          showToast(
            '🔒 Access Denied',
            `You do not have permission to access ${activePath}. Redirected to your authorized dashboard.`,
            'EMERGENCY'
          );
        }
        window.history.replaceState({}, '', authorizedDashboard);
        setCurrentPath(authorizedDashboard);
      } else if (activePath === '/login' || activePath === '/') {
        // Authenticated users landing on /login or / should be routed to their dashboard
        window.history.replaceState({}, '', authorizedDashboard);
        setCurrentPath(authorizedDashboard);
      } else if (activePath !== currentPath) {
        setCurrentPath(activePath);
      }
    }
  }, [isAuthenticated, currentRole, showToast, currentPath]);

  const handleNavigate = useCallback((destination: string) => {
    let targetRoute = destination;
    if (destination === 'patient-dashboard' || destination === 'patient') targetRoute = '/patient/dashboard';
    else if (destination === 'admin-dashboard' || destination === 'admin') targetRoute = '/admin/dashboard';
    else if (destination === 'hospital-dashboard' || destination === 'hospital') targetRoute = '/hospital/dashboard';
    else if (destination === 'login') targetRoute = '/login';
    else if (destination === 'admin-login') targetRoute = '/admin/login';
    else if (destination === 'hospital-login') targetRoute = '/hospital/login';
    else if (destination === 'patient-login') targetRoute = '/patient/login';

    if (isAuthenticated) {
      // Prevent navigation outside authorized role
      const authorizedDashboard = getAuthorizedDashboardRoute(currentRole);
      if (
        (currentRole === 'PATIENT' && !targetRoute.startsWith('/patient')) ||
        ((currentRole === 'ADMIN' || currentRole === 'SYSTEM_ADMIN') && !targetRoute.startsWith('/admin')) ||
        ((currentRole === 'HOSPITAL' || currentRole === 'HOSPITAL_ADMIN' || currentRole === 'DOCTOR' || currentRole === 'TRIAGE') && !targetRoute.startsWith('/hospital'))
      ) {
        targetRoute = authorizedDashboard;
      }
    }

    if (window.location.pathname !== targetRoute) {
      window.history.pushState({}, '', targetRoute);
    }
    setCurrentPath(targetRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isAuthenticated, currentRole]);

  // UNAUTHENTICATED GATE: Render dedicated login portal according to route
  if (!isAuthenticated) {
    const rawPath = normalizePath(window.location.pathname);

    // Dedicated Admin Login Route (/admin or /admin/login or /admin/*)
    if (rawPath.startsWith('/admin')) {
      return (
        <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center font-sans selection:bg-purple-600 selection:text-white">
          <AdminLoginPage onNavigate={handleNavigate} />
        </div>
      );
    }

    // Hospital Login Route (/hospital or /hospital/login)
    if (rawPath.startsWith('/hospital')) {
      return (
        <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center font-sans selection:bg-blue-600 selection:text-white">
          <LoginPage onNavigate={handleNavigate} initialPortal="HOSPITAL" />
        </div>
      );
    }

    // Patient Login Route (/patient or /patient/login)
    if (rawPath.startsWith('/patient')) {
      return (
        <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center font-sans selection:bg-teal-500 selection:text-white">
          <LoginPage onNavigate={handleNavigate} initialPortal="PATIENT" />
        </div>
      );
    }

    // Portal Chooser (/login or /)
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center font-sans selection:bg-teal-500 selection:text-white">
        <LoginPage onNavigate={handleNavigate} initialPortal="CHOOSE" />
      </div>
    );
  }

  // AUTHENTICATED GATE: Render STRICTLY the dashboard belonging to authenticated role
  const renderRoleDashboard = () => {
    if (currentRole === 'PATIENT') {
      return <PatientDashboard />;
    }
    if (currentRole === 'ADMIN' || currentRole === 'SYSTEM_ADMIN') {
      return <AdminDashboard />;
    }
    // Hospital accounts (HOSPITAL, HOSPITAL_ADMIN, DOCTOR, TRIAGE)
    return <HospitalDashboard />;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Global Navbar with authenticated user identity and logout only */}
      <Navbar currentPage={currentPath} onNavigate={handleNavigate} />

      {/* Strict Role-Isolated Dashboard Viewport */}
      <main className="flex-1">
        {renderRoleDashboard()}
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
