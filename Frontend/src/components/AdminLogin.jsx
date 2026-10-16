import React, { useState } from 'react';
import {
  Lock,
  ShieldAlert,
  ArrowRight,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { loginAdmin } from '../services/api';

/**
 * AdminLogin.jsx
 *
 * Secure Administrator Authentication Screen
 * - Sends entered PIN directly to POST /api/admin/login
 * - On 200: Saves signed JWT in sessionStorage and grants dashboard access
 * - On 401: Clears input, shakes field, and displays "गलत पिन, पुनः प्रयास करें"
 * - No client-side fallback credentials or hardcoded PIN hints
 */
export default function AdminLogin({ onLoginSuccess }) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedPin = pin.trim();
    if (!trimmedPin) {
      setErrorMessage('कृपया सुरक्षा पिन दर्ज करें (Please enter PIN)');
      triggerShake();
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // POST request to /api/admin/login
      const response = await loginAdmin(trimmedPin);

      if (response && response.success && response.token) {
        // Store JWT token strictly in sessionStorage (not plain localStorage)
        sessionStorage.setItem('avaps_admin_token', response.token);
        // Grant access to the admin setup dashboard
        if (onLoginSuccess) {
          onLoginSuccess(response.token);
        }
      } else {
        throw new Error('प्रमाणीकरण विफल (Authentication failed)');
      }
    } catch (err) {
      setPin('');
      triggerShake();

      if (err.response?.status === 401) {
        // Exact requirement: "गलत पिन, पुनः प्रयास करें"
        setErrorMessage('गलत पिन, पुनः प्रयास करें');
      } else if (err.response?.status === 403) {
        setErrorMessage('पहुंच अस्वीकृत। कृपया पुनः प्रयास करें।');
      } else {
        setErrorMessage(
          err.response?.data?.message ||
            'सर्वर से संपर्क नहीं हो पाया। पुनः प्रयास करें।'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => {
      setIsShaking(false);
    }, 500);
  };

  return (
    <div className="w-full max-w-md mx-auto py-6 sm:py-10">
      <div
        className={`clay-card p-6 sm:p-8 space-y-6 text-center transition-all duration-300 ${
          isShaking ? 'animate-shake ring-2 ring-rose-500/50' : ''
        }`}
      >
        {/* Shield Icon Header */}
        <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-3xl clay-card flex items-center justify-center text-indigo-400 shadow-xl">
          <div className="absolute inset-0 rounded-3xl bg-indigo-500/10 animate-pulse pointer-events-none" />
          <KeyRound className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400" />
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full clay-pill text-indigo-300 text-[11px] font-black uppercase tracking-wider">
            <Lock className="w-3 h-3 text-indigo-400" />
            <span>सुरक्षित एडमिन प्रमाणीकरण</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            प्रशासक लॉगिन (Admin Login)
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            आंगनवाड़ी केंद्र की लोकेशन एवं जियोफेंस सेटिंग्स कॉन्फ़िगर करने हेतु
            अधिकृत एडमिन पिन दर्ज करें।
          </p>
        </div>

        {/* PIN Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label
              htmlFor="admin-secure-pin"
              className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              एडमिन सुरक्षा पिन (Security PIN) <span className="text-rose-400">*</span>
            </label>

            <div className="relative">
              <input
                id="admin-secure-pin"
                type={showPin ? 'text' : 'password'}
                maxLength={12}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                disabled={isLoading}
                placeholder="सुरक्षा पिन दर्ज करें..."
                className={`w-full clay-inset px-4 py-3.5 pr-11 text-slate-100 placeholder-slate-500 text-base font-mono tracking-widest focus:outline-none focus:ring-2 transition rounded-2xl ${
                  errorMessage
                    ? 'ring-2 ring-rose-500/60 focus:ring-rose-500'
                    : 'focus:ring-indigo-500'
                }`}
                autoFocus
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer transition"
                title={showPin ? 'पिन छुपाएं' : 'पिन दिखाएं'}
              >
                {showPin ? (
                  <EyeOff className="w-4 h-4 text-slate-300" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !pin.trim()}
            className="clay-btn-indigo w-full py-3.5 px-5 rounded-2xl flex items-center justify-center gap-2 text-sm font-black text-white cursor-pointer shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>प्रमाणीकरण हो रहा है...</span>
              </>
            ) : (
              <>
                <span>सत्यापित करें और खोलें</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security badge footer */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>2-घंटे का हस्ताक्षरित JWT सुरक्षा सत्र (Signed 2h JWT Session)</span>
        </div>
      </div>
    </div>
  );
}
