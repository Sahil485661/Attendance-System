import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import AttendanceFlow from './components/AttendanceFlow';
import KendraSetupPage from './components/KendraSetupPage';
import BackendStatusBanner from './components/BackendStatusBanner';
import { fetchKendraConfig } from './services/api';
import { ShieldCheck } from 'lucide-react';

/**
 * App.jsx
 *
 * Streamlined Production Architecture:
 * 1. Daily Attendance View (Default): Large Hindi-first camera capture & WhatsApp proof share
 * 2. Protected Admin View (/admin): PIN verification, ground-truth GPS setup & ledger review
 */
export default function App() {
  // Navigation tabs: 'attendance' (Default) | 'admin'
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || hash === '#admin') {
        return 'admin';
      }
    }
    return 'attendance';
  });

  // Kendra ground-truth metadata
  const [kendraConfig, setKendraConfig] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Load Kendra Configuration on startup
  const loadConfig = useCallback(async () => {
    try {
      const data = await fetchKendraConfig();
      setKendraConfig(data);
      setIsConnected(true);
    } catch (err) {
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Sync tab with URL / history
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      if (tab === 'admin') {
        window.history.pushState(null, '', '/admin');
      } else {
        window.history.pushState(null, '', '/');
      }
    }
  };

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await loadConfig();
    setIsRefreshing(false);
    showToast('डेटा सफलतापूर्वक रीलोड हुआ');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 ${
              toast.type === 'error'
                ? 'bg-rose-500 text-white'
                : 'bg-emerald-500 text-white'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onRefresh={handleRefreshAll}
        isRefreshing={isRefreshing}
        isConnected={isConnected}
        kendraName={kendraConfig?.kendraName}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-12">
        {/* Offline Warning Banner */}
        {!isConnected && (
          <div className="mb-6">
            <BackendStatusBanner
              onRetry={handleRefreshAll}
              isChecking={isRefreshing}
            />
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 1: DAILY ATTENDANCE (DEFAULT VIEW)                  */}
        {/* ======================================================== */}
        {activeTab === 'attendance' && (
          <section className="py-1 sm:py-2">
            <AttendanceFlow kendraConfig={kendraConfig} />
          </section>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: PROTECTED ADMIN DASHBOARD (/admin)               */}
        {/* ======================================================== */}
        {activeTab === 'admin' && (
          <section className="py-1 sm:py-2">
            <KendraSetupPage
              onConfigSaved={() => {
                loadConfig();
                showToast('आंगनवाड़ी केंद्र सफलतापूर्वक कॉन्फ़िगर हो गया!');
              }}
              onGoToAttendance={() => handleTabChange('attendance')}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="print:hidden border-t border-slate-900 py-6 pb-24 md:pb-6 mt-8 sm:mt-12 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-left">
          <p className="flex items-center justify-center sm:justify-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>आंगनवाड़ी डिजिटल उपस्थिति एवं साक्ष्य प्रणाली (AVAPS Production)</span>
          </p>
          <p>© {new Date().getFullYear()} Anganwadi Kendra. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
