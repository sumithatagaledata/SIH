import React, { useState } from 'react';
import {
  ShieldAlert, Lock, Mail, ArrowRight, RefreshCw,
  AlertTriangle, ArrowLeft, HeartPulse
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

interface AdminLoginPageProps {
  onNavigate?: (page: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const { showToast } = useNotification();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setErrorMessage('Please enter your Admin Email.');
      return;
    }
    if (!cleanPassword) {
      setErrorMessage('Please enter your Admin Password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(cleanEmail, cleanPassword);
      if (res.success) {
        showToast(
          '🔐 Administrator Verified',
          'Platform Admin session authenticated successfully.',
          'INFO'
        );
        if (onNavigate) {
          onNavigate('/admin/dashboard');
        }
      } else {
        setErrorMessage(res.message || 'Invalid admin credentials. Please check your email and password.');
      }
    } catch {
      setErrorMessage('An unexpected error occurred during admin authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('/login');
    }
  };

  const inputCls =
    'w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition shadow-sm';
  const labelCls = 'text-xs font-bold text-slate-700 flex items-center gap-1 mb-1';

  return (
    <div className="min-h-[88vh] flex flex-col justify-center max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-fadeIn">
      {/* Brand Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/20">
            <HeartPulse className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">MediBridge AI</h1>
              <span className="text-xs font-extrabold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded uppercase">
                Admin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Platform Administration &amp; System Control</p>
          </div>
        </div>
      </div>

      {/* Admin Login Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl max-w-md mx-auto w-full space-y-6">
        {/* Header with Back button and badge */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Portals</span>
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold bg-purple-50 text-purple-800 border-purple-200">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Admin Portal</span>
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <span>🔐 Admin Login</span>
          </h2>
          <p className="text-xs text-slate-500">Sign in with your verified administrator credentials.</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2.5 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Admin Login Form */}
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className={labelCls}>
              <Mail className="w-3.5 h-3.5 text-purple-600" />
              <span>Admin Email</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter admin email"
              className={inputCls}
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>
              <Lock className="w-3.5 h-3.5 text-purple-600" />
              <span>Admin Password</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className={inputCls}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm rounded-xl shadow-md shadow-purple-700/20 transition flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Login to Admin Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
