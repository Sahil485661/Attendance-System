import React from 'react';
import {
  Camera,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RefreshCw,
} from 'lucide-react';

/**
 * Navbar.jsx
 *
 * Production Streamlined Navigation (2 Clean Views)
 * 1. Daily Attendance View (Default)
 * 2. Protected Admin View (/admin)
 */
export default function Navbar({
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing,
  isConnected,
  kendraName,
}) {
  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full clay-nav transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand & Kendra Title */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 clay-btn-emerald flex items-center justify-center shrink-0 ring-1 ring-white/20">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-xl font-black tracking-tight text-white truncate">
                  आंगनवाड़ी AVAPS
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full clay-pill-emerald text-emerald-300 shrink-0">
                  साक्ष्य प्रणाली
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium truncate max-w-[180px] sm:max-w-xs">
                {kendraName || 'आंगनवाड़ी केंद्र (230401)'}
              </p>
            </div>
          </div>

          {/* Desktop & Tablet Navigation: Exactly 2 clean views */}
          <nav className="hidden sm:flex items-center clay-inset p-1.5 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => onTabChange('attendance')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeTab === 'attendance'
                  ? 'clay-tab-active'
                  : 'clay-tab-inactive'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>दैनिक उपस्थिति (Attendance)</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('admin')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeTab === 'admin'
                  ? 'clay-pill-amber text-amber-300 font-black'
                  : 'clay-tab-inactive'
              }`}
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>प्रशासक सेटअप (Admin)</span>
            </button>
          </nav>

          {/* Status Indicator & Refresh Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold ${
                isConnected
                  ? 'clay-pill-emerald text-emerald-300'
                  : 'clay-pill-amber text-amber-300'
              }`}
            >
              {isConnected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="hidden sm:inline">सर्वर सक्रिय</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 animate-pulse text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">ऑफ़लाइन</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 sm:p-2.5 clay-btn-dark text-slate-300 hover:text-white transition disabled:opacity-50 cursor-pointer"
              title="डेटा रीलोड करें"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sticky Bottom Navigation (Phone screens < sm) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-3 py-2 flex items-center justify-around">
        <button
          type="button"
          onClick={() => onTabChange('attendance')}
          className={`flex-1 flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition cursor-pointer ${
            activeTab === 'attendance'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 font-medium'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span className="text-[10px]">दैनिक हाजिरी</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('admin')}
          className={`flex-1 flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition cursor-pointer ${
            activeTab === 'admin'
              ? 'text-amber-300 font-bold'
              : 'text-slate-400 font-medium'
          }`}
        >
          <KeyRound className="w-5 h-5" />
          <span className="text-[10px]">एडमिन सेटअप</span>
        </button>
      </div>
    </>
  );
}
