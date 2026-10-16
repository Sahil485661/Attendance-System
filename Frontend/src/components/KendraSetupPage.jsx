import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Building2,
  FileText,
  Save,
  Compass,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import {
  fetchAdminKendraConfig,
  saveAdminKendraConfig,
  fetchAdminAttendanceRecords,
} from '../services/api';
import AdminLogin from './AdminLogin';

export default function KendraSetupPage({ onConfigSaved, onGoToAttendance }) {
  // Authentication State: JWT Token stored in sessionStorage
  const [adminToken, setAdminToken] = useState(
    () => sessionStorage.getItem('avaps_admin_token') || ''
  );
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('config'); // 'config' | 'records'

  // Form Fields State
  const [kendraName, setKendraName] = useState('');
  const [kendraCode, setKendraCode] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [accuracy, setAccuracy] = useState(null);
  const [allowedRadiusMeters, setAllowedRadiusMeters] = useState(100);

  // GPS Satellite Fix State
  const [isGpsFixing, setIsGpsFixing] = useState(false);
  const [gpsStatusText, setGpsStatusText] = useState('');
  const [gpsWarning, setGpsWarning] = useState('');
  const [gpsError, setGpsError] = useState('');

  // Submit / Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState(null);
  const [submitError, setSubmitError] = useState('');

  // Attendance Records State
  const [records, setRecords] = useState([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // Load existing configuration from backend using verified JWT token
  const loadConfig = useCallback(async (token) => {
    if (!token) {
      setIsUnlocked(false);
      return;
    }

    try {
      const data = await fetchAdminKendraConfig(token);
      if (data?.config) {
        setKendraName(data.config.kendraName || '');
        setKendraCode(data.config.kendraCode || '');
        setAddress(data.config.address || '');
        setAllowedRadiusMeters(data.config.allowedRadiusMeters || 100);

        if (
          data.config.location?.coordinates &&
          data.config.location.coordinates.length === 2
        ) {
          setLongitude(data.config.location.coordinates[0]);
          setLatitude(data.config.location.coordinates[1]);
        }
      }
      setIsUnlocked(true);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        sessionStorage.removeItem('avaps_admin_token');
        setAdminToken('');
        setIsUnlocked(false);
      } else {
        setSubmitError(
          err.response?.data?.message || 'सर्वर से संपर्क नहीं हो पाया।'
        );
      }
    }
  }, []);

  // Load verified attendance records for admin review
  const loadRecords = useCallback(async (token) => {
    const t = token || adminToken;
    if (!t) return;
    setIsLoadingRecords(true);
    try {
      const data = await fetchAdminAttendanceRecords(t);
      setRecords(data?.records || []);
    } catch (err) {
      // Error loading records
    } finally {
      setIsLoadingRecords(false);
    }
  }, [adminToken]);

  // Auth Guard
  useEffect(() => {
    const savedToken = sessionStorage.getItem('avaps_admin_token');
    if (savedToken) {
      loadConfig(savedToken);
    } else {
      setIsUnlocked(false);
      setAdminToken('');
    }
  }, [loadConfig]);

  const handleLoginSuccess = (token) => {
    setAdminToken(token);
    loadConfig(token);
  };

  const handleLockAdmin = () => {
    sessionStorage.removeItem('avaps_admin_token');
    setAdminToken('');
    setIsUnlocked(false);
    setSuccessBanner(null);
    setSubmitError('');
  };

  // Capture current real physical GPS location as Kendra Ground-Truth
  const handleCaptureCurrentGPS = () => {
    setIsGpsFixing(true);
    setGpsError('');
    setGpsWarning('');
    setGpsStatusText('उपग्रहों से संपर्क साधा जा रहा है...');

    if (!navigator.geolocation) {
      setGpsError('इस डिवाइस अथवा ब्राउज़र में GPS उपलब्ध नहीं है।');
      setIsGpsFixing(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        const acc = Math.round(pos.coords.accuracy * 10) / 10;

        setLatitude(lat);
        setLongitude(lng);
        setAccuracy(acc);
        setIsGpsFixing(false);
        setGpsStatusText(`सफलतापूर्वक लॉक हुआ (±${acc}m accuracy)`);

        if (acc > 30) {
          setGpsWarning(
            `⚠️ GPS सटीकता ±${acc}m है। खुले आसमान के नीचे बेहतर परिणाम मिलेंगे।`
          );
        } else {
          setGpsWarning('');
        }
      },
      (err) => {
        setIsGpsFixing(false);
        let msg = 'लोकेशन प्राप्त करने में त्रुटि।';
        if (err.code === 1) {
          msg = 'लोकेशन अनुमति अस्वीकृत। कृपया लोकेशन अनुमति प्रदान करें।';
        } else if (err.code === 2) {
          msg = 'GPS सिग्नल अनुपलब्ध। फ़ोन की लोकेशन सेवा चालू करें।';
        } else if (err.code === 3) {
          msg = 'समय समाप्त (GPS timeout). कृपया पुनः प्रयास करें।';
        }
        setGpsError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // Form submission handler
  const handleSubmitConfig = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSuccessBanner(null);

    if (!kendraName.trim()) {
      setSubmitError('कृपया केंद्र का नाम दर्ज करें।');
      return;
    }
    if (!kendraCode.trim()) {
      setSubmitError('कृपया केंद्र कोड दर्ज करें।');
      return;
    }
    if (!address.trim()) {
      setSubmitError('कृपया आधिकारिक पता दर्ज करें।');
      return;
    }
    if (latitude === '' || longitude === '') {
      setSubmitError(
        'केंद्र के GPS निर्देशांक आवश्यक हैं। "वर्तमान GPS को केंद्र का स्थान बनाएं" बटन दबाएँ।'
      );
      return;
    }

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setSubmitError('अमान्य अक्षांश (-90 और 90 के बीच होना चाहिए)।');
      return;
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      setSubmitError('अमान्य देशांतर (-180 और 180 के बीच होना चाहिए)।');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        kendraName: kendraName.trim(),
        kendraCode: kendraCode.trim(),
        address: address.trim(),
        latitude: latNum,
        longitude: lngNum,
        allowedRadiusMeters: parseInt(allowedRadiusMeters, 10) || 100,
      };

      const response = await saveAdminKendraConfig(adminToken, payload);

      if (response?.config) {
        setSuccessBanner({
          title: 'आंगनवाड़ी केंद्र सफलतापूर्वक कॉन्फ़िगर हो गया!',
          details: `${payload.kendraName} (${payload.kendraCode}) — GPS: ${latNum}°, ${lngNum}° | दायरा: ${payload.allowedRadiusMeters}m`,
          updatedAt: response.config.updatedAt || new Date().toISOString(),
        });

        if (onConfigSaved) {
          onConfigSaved(response.config);
        }
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        handleLockAdmin();
        setSubmitError(
          'सत्र समाप्त हो गया है। कृपया पुनः लॉगिन करें।'
        );
        return;
      }
      setSubmitError(
        err.response?.data?.message || 'कॉन्फ़िगरेशन सहेजने में समस्या हुई।'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full pb-12 sm:pb-16 px-1 sm:px-0 animate-fade-in space-y-6 sm:space-y-8">
      {/* ======================================================== */}
      {/* 1. AUTHENTICATION GATE (SECURE JWT LOGIN)                */}
      {/* ======================================================== */}
      {!isUnlocked ? (
        <AdminLogin onLoginSuccess={handleLoginSuccess} />
      ) : (
        /* ======================================================== */
        /* 2. PROTECTED ADMIN DASHBOARD (CONFIG & AUDIT RECORDS)    */
        /* ======================================================== */
        <div className="space-y-6 sm:space-y-8 animate-fade-in">
          {/* Header Banner */}
          <div className="clay-card p-5 sm:p-7 md:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                <Compass className="w-4 h-4" />
                <span>प्रमाणिक केंद्र स्थापना (Ground-Truth Authority)</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white">
                आंगनवाड़ी केंद्र व्यवस्थापक सेटअप
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">
                यह स्थान हाजिरी सत्यापन और वॉटरमार्किंग हेतु आधिकारिक केंद्र माना जाएगा।
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleLockAdmin}
                className="clay-btn-dark px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                title="सत्र समाप्त करें"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>लॉगआउट</span>
              </button>
            </div>
          </div>

          {/* Sub-tab Navigation: Setup Form vs Attendance Records */}
          <div className="flex items-center justify-center">
            <div className="clay-inset p-1 rounded-2xl inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveSubTab('config')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeSubTab === 'config'
                    ? 'clay-btn-emerald text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>केंद्र लोकेशन एवं दायरा</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab('records');
                  loadRecords();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeSubTab === 'records'
                    ? 'clay-btn-emerald text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>सत्यापित उपस्थिति रजिस्टर</span>
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {successBanner && (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-3.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <h4 className="font-bold text-white text-sm sm:text-base">
                  {successBanner.title}
                </h4>
                <p className="mt-1 text-slate-300">{successBanner.details}</p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {submitError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {activeSubTab === 'config' ? (
            <form onSubmit={handleSubmitConfig} className="space-y-6">
              {/* SECTION 1: Official Details */}
              <div className="clay-card p-5 sm:p-7 md:p-8 space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-extrabold text-white">
                    1. केंद्र की आधिकारिक जानकारी
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      केंद्र का नाम <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={kendraName}
                      onChange={(e) => setKendraName(e.target.value)}
                      placeholder="उदा. आंगनवाड़ी केंद्र - करही"
                      className="w-full clay-inset px-4 py-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-2xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      केंद्र कोड (Kendra Code) <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={kendraCode}
                      onChange={(e) => setKendraCode(e.target.value)}
                      placeholder="उदा. AW-45012"
                      className="w-full clay-inset px-4 py-3 text-slate-100 placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-2xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    भौतिक पता (Physical Address) <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="उदा. प्राथमिक शाला के पास, वार्ड नं. 02, करही"
                    className="w-full clay-inset px-4 py-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-2xl"
                  />
                </div>
              </div>

              {/* SECTION 2: Ground-Truth GPS */}
              <div className="clay-card p-5 sm:p-7 md:p-8 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-base font-extrabold text-white">
                      2. केंद्र का वास्तविक GPS स्थान
                    </h3>
                  </div>
                  {latitude && longitude && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>GPS निर्धारित</span>
                    </span>
                  )}
                </div>

                <div className="clay-inset p-4 sm:p-5 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white">
                        केंद्र पर खड़े होकर यह बटन दबाएँ
                      </h4>
                      <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                        यह फ़ोन के वास्तविक GPS हार्डवेयर से आधिकारिक अक्षांश व देशांतर रिकॉर्ड करेगा।
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isGpsFixing}
                      onClick={handleCaptureCurrentGPS}
                      className="clay-btn-emerald px-5 py-3 rounded-2xl text-xs sm:text-sm font-black text-white flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 shrink-0"
                    >
                      {isGpsFixing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>उपग्रह ट्रैक हो रहा है...</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4" />
                          <span>वर्तमान GPS को केंद्र का स्थान बनाएं</span>
                        </>
                      )}
                    </button>
                  </div>

                  {gpsStatusText && (
                    <p className="text-xs text-emerald-300 font-semibold">{gpsStatusText}</p>
                  )}
                  {gpsWarning && (
                    <p className="text-xs text-amber-300 font-semibold">{gpsWarning}</p>
                  )}
                  {gpsError && (
                    <p className="text-xs text-rose-400 font-semibold">{gpsError}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="clay-inset p-3.5 rounded-2xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      अक्षांश (Latitude)
                    </span>
                    <p className="font-mono text-sm sm:text-base font-bold text-white">
                      {latitude !== '' ? `${latitude}° N` : '— रिक्त —'}
                    </p>
                  </div>

                  <div className="clay-inset p-3.5 rounded-2xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      देशांतर (Longitude)
                    </span>
                    <p className="font-mono text-sm sm:text-base font-bold text-white">
                      {longitude !== '' ? `${longitude}° E` : '— रिक्त —'}
                    </p>
                  </div>

                  <div className="clay-inset p-3.5 rounded-2xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      GPS सटीकता
                    </span>
                    <p className="font-mono text-sm sm:text-base font-bold text-emerald-400">
                      {accuracy !== null ? `±${accuracy} मीटर` : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Geofence Radius */}
              <div className="clay-card p-5 sm:p-7 md:p-8 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-base font-extrabold text-white">
                      3. मान्य भू-सीमा दायरा (Allowed Radius)
                    </h3>
                  </div>
                  <span className="text-sm font-black text-amber-300 font-mono clay-pill-amber px-3 py-1">
                    {allowedRadiusMeters} मीटर
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-1">
                  {[
                    { value: 50, label: '50m', desc: 'सख्त' },
                    { value: 100, label: '100m', desc: 'मानक (अनुशंसित)' },
                    { value: 150, label: '150m', desc: 'विस्तृत' },
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setAllowedRadiusMeters(preset.value)}
                      className={`p-3 rounded-2xl text-center transition cursor-pointer flex flex-col items-center justify-center ${
                        allowedRadiusMeters === preset.value
                          ? 'clay-btn-emerald text-white ring-2 ring-emerald-400'
                          : 'clay-btn-dark text-slate-300 hover:text-white'
                      }`}
                    >
                      <span className="text-sm sm:text-base font-black">
                        {preset.label}
                      </span>
                      <span className="text-[10px] mt-0.5 opacity-80">
                        {preset.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Action */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-2">
                {onGoToAttendance && (
                  <button
                    type="button"
                    onClick={onGoToAttendance}
                    className="w-full sm:w-auto px-6 py-4 clay-btn-dark text-slate-300 font-bold text-xs sm:text-sm text-center cursor-pointer"
                  >
                    हाजिरी स्क्रीन पर जाएँ
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !latitude || !longitude}
                  className="w-full sm:w-auto px-8 py-4 clay-btn-emerald text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed tracking-wide shadow-2xl"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>सहेजा जा रहा है...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>केंद्र कॉन्फ़िगरेशन सहेजें</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Attendance Ledger Records Sub-tab */
            <div className="clay-card p-5 sm:p-7 md:p-8 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-extrabold text-white">
                    सत्यापित उपस्थिति रिकॉर्ड्स ({records.length})
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => loadRecords()}
                  disabled={isLoadingRecords}
                  className="p-2 rounded-xl clay-card hover:text-emerald-400 text-slate-400 transition cursor-pointer"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isLoadingRecords ? 'animate-spin text-emerald-400' : ''}`}
                  />
                </button>
              </div>

              {isLoadingRecords ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                  <p className="text-xs">रिकॉर्ड्स लोड हो रहे हैं...</p>
                </div>
              ) : records.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  कोई रिकॉर्ड उपलब्ध नहीं है।
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {records.map((r) => (
                    <div
                      key={r._id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">
                            {r.kendraName} ({r.kendraCode})
                          </span>
                          <span className="px-2 py-0.5 rounded-full clay-pill-emerald text-[10px] font-black text-emerald-300">
                            {r.geofenceStatus || 'VERIFIED'}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px]">
                          समय: {r.istTime || r.istTimeString} | दूरी: {r.distanceFromCenterMeters || 0}m
                        </p>
                      </div>

                      <a
                        href={r.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold shrink-0 self-start sm:self-center"
                      >
                        <span>फ़ोटो देखें</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
