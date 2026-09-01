import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppNotification } from '../types';
import { db } from '../services/mockDatabase';
import { useAuth } from './AuthContext';

interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'EMERGENCY' | 'TRIAGE' | 'VERIFICATION' | 'SYSTEM' | 'INFO';
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  toasts: ToastItem[];
  showToast: (title: string, message: string, type?: ToastItem['type']) => void;
  dismissToast: (id: string) => void;
  markAsRead: (id: string) => void;
  triggerEmergencyAlertAudio: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentRole } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const loadNotifications = () => {
    const list = db.getNotifications(currentRole || undefined);
    setNotifications(list);
  };

  useEffect(() => {
    loadNotifications();
    const handleUpdate = () => loadNotifications();
    window.addEventListener('medibridge_db_update', handleUpdate);
    window.addEventListener('medibridge_db_reset', handleUpdate);
    return () => {
      window.removeEventListener('medibridge_db_update', handleUpdate);
      window.removeEventListener('medibridge_db_reset', handleUpdate);
    };
  }, [currentRole]);

  const showToast = (title: string, message: string, type: ToastItem['type'] = 'INFO') => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, title, message, type }]);

    if (type === 'EMERGENCY') {
      triggerEmergencyAlertAudio();
    }

    setTimeout(() => {
      dismissToast(id);
    }, 6000);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const markAsRead = (id: string) => {
    db.markNotificationAsRead(id);
    loadNotifications();
  };

  const triggerEmergencyAlertAudio = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.4);
      
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch {
      // Audio context might be restricted before user gesture
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        showToast,
        dismissToast,
        markAsRead,
        triggerEmergencyAlertAudio
      }}
    >
      {children}

      {/* Floating Toasts View */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-2xl border transition-all duration-300 transform translate-y-0 ${
              toast.type === 'EMERGENCY'
                ? 'bg-red-950/95 border-red-500 text-red-100 shadow-red-500/20'
                : toast.type === 'TRIAGE'
                ? 'bg-amber-950/95 border-amber-500 text-amber-100'
                : toast.type === 'VERIFICATION'
                ? 'bg-teal-950/95 border-teal-500 text-teal-100'
                : 'bg-slate-900/95 border-slate-700 text-slate-100'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="font-bold text-sm tracking-wide flex items-center gap-2">
                {toast.type === 'EMERGENCY' && <span className="animate-ping text-red-400">●</span>}
                {toast.title}
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-xs opacity-60 hover:opacity-100 ml-2"
              >
                ✕
              </button>
            </div>
            <div className="text-xs mt-1 leading-relaxed opacity-90">{toast.message}</div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
