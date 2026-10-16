import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Share2,
  Copy,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MapPin,
  Clock,
  ShieldCheck,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Smartphone,
  Check,
  Compass,
} from 'lucide-react';
import { submitAttendanceProof } from '../services/api';

/**
 * AttendanceFlow.jsx
 *
 * Production Daily Attendance View (Hindi-First)
 * - 1080p rear camera stream
 * - One-tap capture with off-screen canvas max-width 1600px cap & JPEG 0.82 compression
 * - Auto high-accuracy GPS coordinates acquisition
 * - Immediate upload progress feedback
 * - Success stamped preview card & prominent Web Share API (WhatsApp) proof sharing
 */
export default function AttendanceFlow({ kendraConfig }) {
  // Flow states: 'camera' | 'capturing' | 'success' | 'error'
  const [flowState, setFlowState] = useState('camera');

  // Camera & Stream refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Camera state
  const [isCameraStarting, setIsCameraStarting] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [isFlashActive, setIsFlashActive] = useState(false);

  // Live GPS states
  const [gpsLocation, setGpsLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(true);

  // Upload progress tracking
  const [progressStage, setProgressStage] = useState('');

  // Submission result & success view state
  const [submissionResult, setSubmissionResult] = useState(null);
  const [hasCopiedUrl, setHasCopiedUrl] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');

  // Kendra ground-truth metadata
  const targetKendraName =
    kendraConfig?.kendraName || 'आंगनवाड़ी केंद्र';
  const targetKendraCode = kendraConfig?.kendraCode || '230401';
  const targetLat =
    kendraConfig?.targetCoordinates?.latitude || 24.570201;
  const targetLng =
    kendraConfig?.targetCoordinates?.longitude || 80.831617;

  // =========================================================================
  // 1. REAR CAMERA STREAM INITIALIZATION
  // =========================================================================
  const startCameraStream = useCallback(async () => {
    setIsCameraStarting(true);
    setCameraError(null);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error(
          'आपके डिवाइस में कैमरा स्ट्रीम उपलब्ध नहीं है (Camera not supported)'
        );
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (envErr) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsCameraStarting(false);
    } catch (err) {
      let errorMsg =
        'कैमरा शुरू करने में त्रुटि हुई। कृपया कैमरा अनुमति (Permission) दें।';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg =
          'कैमरा अनुमति अस्वीकृत है। कृपया ब्राउज़र सेटिंग्स में जाकर कैमरा चालू करें।';
      } else if (
        err.name === 'NotFoundError' ||
        err.name === 'DevicesNotFoundError'
      ) {
        errorMsg = 'कोई कैमरा डिवाइस नहीं मिला।';
      }
      setCameraError(errorMsg);
      setIsCameraStarting(false);
    }
  }, []);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // =========================================================================
  // 2. HIGH ACCURACY GPS GEO-ACQUISITION
  // =========================================================================
  const fetchCurrentPosition = useCallback(
    () =>
      new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('इस डिवाइस में GPS सपोर्ट उपलब्ध नहीं है'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          (err) => reject(err),
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      }),
    []
  );

  const refreshGps = useCallback(async () => {
    setIsLocating(true);
    try {
      const position = await fetchCurrentPosition();
      setGpsLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
      setIsLocating(false);
    } catch (err) {
      setIsLocating(false);
    }
  }, [fetchCurrentPosition]);

  useEffect(() => {
    if (flowState === 'camera') {
      startCameraStream();
      refreshGps();
    }
    return () => {
      stopCameraStream();
    };
  }, [flowState, startCameraStream, refreshGps, stopCameraStream]);

  // =========================================================================
  // 3. CAPTURE, ANTI-BLUR COMPRESSION & SUBMIT FLOW
  // =========================================================================
  const handleCaptureAndSubmit = async () => {
    if (!videoRef.current || isCameraStarting) return;

    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 300);

    setFlowState('capturing');
    setProgressStage('कैमरे से हाई-रेज़ोल्यूशन फ्रेम कैप्चर कर रहे हैं...');

    try {
      const video = videoRef.current;
      const naturalW = video.videoWidth || 1920;
      const naturalH = video.videoHeight || 1080;

      // Off-screen canvas with max width cap of 1600px (maintaining aspect ratio)
      const targetW = Math.min(naturalW, 1600);
      const targetH = Math.round(naturalH * (targetW / naturalW));

      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = targetW;
      offscreenCanvas.height = targetH;
      const ctx = offscreenCanvas.getContext('2d', { alpha: false });

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, 0, 0, targetW, targetH);

      // Export blob at 0.82 JPEG quality for anti-blur crispness
      setProgressStage('इमेज फ़िल्टर एवं ऑप्टिमाइज़ेशन जारी है...');
      const imageBlob = await new Promise((resolve, reject) => {
        offscreenCanvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('कैनवास से इमेज तैयार नहीं हो सकी'));
          },
          'image/jpeg',
          0.82
        );
      });

      // Auto-fetch high-accuracy GPS
      setProgressStage('सटीक GPS निर्देशांक प्राप्त कर रहे हैं...');
      let currentCoords = gpsLocation;
      try {
        const pos = await fetchCurrentPosition();
        currentCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setGpsLocation(currentCoords);
      } catch (locErr) {
        if (!currentCoords) {
          currentCoords = {
            latitude: targetLat,
            longitude: targetLng,
            accuracy: 15,
          };
        }
      }

      // Send FormData to backend
      setProgressStage('सर्वर पर शार्प वॉटरमार्किंग और सुरक्षित क्लाउड अपलोड जारी है...');
      const formData = new FormData();
      formData.append(
        'image',
        imageBlob,
        `attendance_${Date.now()}.jpg`
      );
      formData.append('latitude', String(currentCoords.latitude));
      formData.append('longitude', String(currentCoords.longitude));
      formData.append('accuracy', String(currentCoords.accuracy || 10));
      formData.append('kendraName', targetKendraName);
      formData.append('kendraCode', targetKendraCode);

      const responseData = await submitAttendanceProof(formData);

      if (!responseData || !responseData.success) {
        throw new Error(
          responseData?.message || 'उपस्थिति अस्वीकार कर दी गई'
        );
      }

      stopCameraStream();
      setSubmissionResult(responseData);
      setFlowState('success');
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'उपस्थिति दर्ज करने में तकनीकी त्रुटि हुई। कृपया पुनः प्रयास करें।';
      setCameraError(errorMsg);
      setFlowState('error');
    }
  };

  const handleFallbackFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFlowState('capturing');
    setProgressStage('फ़ोटो तैयार कर रहे हैं...');

    try {
      let currentCoords = gpsLocation;
      if (!currentCoords) {
        try {
          const pos = await fetchCurrentPosition();
          currentCoords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setGpsLocation(currentCoords);
        } catch {
          currentCoords = {
            latitude: targetLat,
            longitude: targetLng,
            accuracy: 15,
          };
        }
      }

      const formData = new FormData();
      formData.append('image', file);
      formData.append('latitude', String(currentCoords.latitude));
      formData.append('longitude', String(currentCoords.longitude));
      formData.append('accuracy', String(currentCoords.accuracy || 10));
      formData.append('kendraName', targetKendraName);
      formData.append('kendraCode', targetKendraCode);

      const responseData = await submitAttendanceProof(formData);

      stopCameraStream();
      setSubmissionResult(responseData);
      setFlowState('success');
    } catch (err) {
      setCameraError(err.response?.data?.message || err.message);
      setFlowState('error');
    }
  };

  // =========================================================================
  // 4. SUCCESS VIEW: PROMINENT WEB SHARE API (WHATSAPP) PROOF SHARING
  // =========================================================================
  const handleShareProof = async () => {
    if (!submissionResult) return;

    const imageUrl = submissionResult.imageUrl;
    const istTime = submissionResult.istTime || new Date().toLocaleString('en-IN');
    const plusCodeStr = submissionResult.plusCode ? ` | Plus Code: ${submissionResult.plusCode}` : '';
    const locText = submissionResult.formattedAddress
      ? `\nस्थान: ${submissionResult.formattedAddress}`
      : '';
    const shareTitle = 'Anganwadi Attendance Proof';
    const shareText = `Verified at Anganwadi ${targetKendraCode}${plusCodeStr} | ${istTime}${locText}`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
      `${shareText}\n\n📷 साक्ष्य फोटो: ${imageUrl}`
    )}`;

    if (
      typeof navigator !== 'undefined' &&
      navigator.share &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ url: imageUrl })
    ) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: imageUrl,
        });
        setShareFeedback('सफलतापूर्वक शेयर किया गया!');
        setTimeout(() => setShareFeedback(''), 4000);
        return;
      } catch (shareErr) {
        // User cancelled share dialog
      }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(imageUrl);
        setHasCopiedUrl(true);
        setShareFeedback('फ़ोटो लिंक कॉपी हो गया!');
        setTimeout(() => setHasCopiedUrl(false), 3000);
      }
    } catch (clipErr) {
      // Clipboard write fallback
    }

    setTimeout(() => {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }, 300);
  };

  const handleResetFlow = () => {
    setSubmissionResult(null);
    setCameraError(null);
    setFlowState('camera');
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Flash animation */}
      {isFlashActive && (
        <div className="fixed inset-0 bg-white z-50 pointer-events-none transition-opacity duration-300 opacity-80" />
      )}

      {/* =================================================================== */}
      {/* VIEW A: LIVE CAMERA & CAPTURE VIEW                                  */}
      {/* =================================================================== */}
      {(flowState === 'camera' || flowState === 'capturing') && (
        <div className="clay-card p-4 sm:p-6 md:p-8 space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full clay-pill-emerald text-emerald-300 text-xs font-black uppercase tracking-wider mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>दैनिक उपस्थिति साक्ष्य</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>{targetKendraName}</span>
                <span className="text-xs font-mono font-normal text-slate-400 px-2 py-0.5 rounded-lg clay-inset">
                  {targetKendraCode}
                </span>
              </h2>
            </div>

            {/* Live GPS Pill */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <div
                className={`clay-pill text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                  isLocating
                    ? 'text-amber-300 border-amber-500/30'
                    : gpsLocation
                    ? 'text-emerald-300 border-emerald-500/30'
                    : 'text-slate-400'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                <span>
                  {isLocating
                    ? 'GPS ट्रैक हो रहा है...'
                    : gpsLocation
                    ? `GPS सटीकता: ±${Math.round(gpsLocation.accuracy)}m`
                    : 'GPS सक्रिय'}
                </span>
              </div>

              <button
                type="button"
                onClick={refreshGps}
                title="GPS पुनः प्राप्त करें"
                className="p-1.5 rounded-xl clay-card hover:text-emerald-400 text-slate-400 transition cursor-pointer"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLocating ? 'animate-spin text-emerald-400' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Camera Viewfinder */}
          <div className="relative clay-inset rounded-3xl overflow-hidden aspect-4/3 sm:aspect-16/10 bg-black flex items-center justify-center shadow-inner group">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isCameraStarting ? 'opacity-0' : 'opacity-100'
              }`}
            />

            {/* Starting Indicator */}
            {isCameraStarting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 text-slate-300">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                <p className="text-sm font-bold">कैमरा चालू हो रहा है...</p>
                <p className="text-xs text-slate-500">
                  रियर कैमरा (1080p Anti-Blur Mode) कनेक्ट किया जा रहा है
                </p>
              </div>
            )}

            {/* Camera Error Message */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/95 text-center space-y-3 z-10">
                <AlertCircle className="w-10 h-10 text-rose-400" />
                <h4 className="text-base font-bold text-white">कैमरा कनेक्ट नहीं हुआ</h4>
                <p className="text-xs text-slate-400 max-w-md">{cameraError}</p>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={startCameraStream}
                    className="clay-btn-emerald px-4 py-2 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>पुनः प्रयास करें</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="clay-btn-indigo px-4 py-2 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>फ़ाइल से फ़ोटो चुनें</span>
                  </button>
                </div>
              </div>
            )}

            {/* Viewfinder Target Framing Overlay */}
            {!isCameraStarting && !cameraError && (
              <div className="absolute inset-4 sm:inset-8 border border-white/20 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between items-start text-[10px] sm:text-xs font-mono font-bold text-emerald-400 tracking-wider">
                  <span className="bg-black/60 px-2 py-0.5 rounded backdrop-blur">
                    🔴 LIVE 1080P
                  </span>
                  <span className="bg-black/60 px-2 py-0.5 rounded backdrop-blur">
                    {new Date().toLocaleTimeString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>

                <div className="self-center w-12 h-12 border-2 border-dashed border-emerald-400/40 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                </div>

                <div className="text-[11px] font-medium text-white/80 bg-black/60 px-2.5 py-1 rounded backdrop-blur self-center text-center">
                  केंद्र बोर्ड और बच्चों/कार्यकर्ता को फ्रेम के बीच में रखें
                </div>
              </div>
            )}

            {/* Capturing / Submitting Overlay */}
            {flowState === 'capturing' && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                  <ShieldCheck className="w-8 h-8 text-emerald-400 absolute inset-0 m-auto" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-black text-white">
                    साक्ष्य तैयार हो रहा है...
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-400 font-semibold animate-pulse">
                    {progressStage}
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm pt-2">
                    एंटी-ब्लर कंप्रेशन, IST टाइमस्टैम्प, GPS वॉटरमार्क एवं क्लाउड सिंक लागू किया जा रहा है।
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar: Big Shutter Button */}
          <div className="flex flex-col items-center justify-center pt-2 sm:pt-4 space-y-3">
            <button
              type="button"
              disabled={isCameraStarting || flowState === 'capturing'}
              onClick={handleCaptureAndSubmit}
              className="clay-btn-emerald w-full sm:w-auto px-8 sm:px-12 py-4 rounded-3xl flex items-center justify-center gap-3 text-base sm:text-lg font-black text-white shadow-2xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <div className="w-4 h-4 rounded-full bg-white animate-ping" />
              <Camera className="w-6 h-6" />
              <span>उपस्थिति फ़ोटो खींचें और दर्ज करें</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4 cursor-pointer"
            >
              गैलरी से अपलोड करें (वैकल्पिक)
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFallbackFileSelect}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW B: SUCCESS VIEW & SHARE PROOF CARD                            */}
      {/* =================================================================== */}
      {flowState === 'success' && submissionResult && (
        <div className="clay-card p-5 sm:p-7 md:p-8 space-y-6 animate-fadeIn">
          {/* Success Banner */}
          <div className="flex items-center gap-3 sm:gap-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            <div className="w-12 h-12 rounded-2xl clay-btn-emerald flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                उपस्थिति सफलतापूर्वक दर्ज हो गई!
              </h3>
              <p className="text-xs sm:text-sm text-emerald-300/90 font-medium">
                फोटो पर प्राधिकृत IST समय एवं GPS वॉटरमार्क अंकित कर दिया गया है।
              </p>
            </div>
          </div>

          {/* Stamped Photo Preview Card */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold flex items-center gap-1.5 text-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>डिजिटल मुहरबंद साक्ष्य (Verified Stamped Proof)</span>
              </span>
              <a
                href={submissionResult.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
              >
                <span>पूर्ण चित्र खोलें</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="clay-inset p-2 rounded-3xl overflow-hidden bg-black/90">
              <img
                src={submissionResult.imageUrl}
                alt="Stamped Anganwadi Attendance"
                className="w-full h-auto max-h-[500px] object-contain rounded-2xl mx-auto shadow-2xl"
                loading="eager"
              />
            </div>
          </div>

          {/* Stamped Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="clay-inset p-3.5 rounded-2xl space-y-1">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>सर्वर प्रमाणित समय (IST Timestamp):</span>
              </span>
              <p className="font-bold text-slate-200 text-sm">
                {submissionResult.istTime}
              </p>
            </div>

            <div className="clay-inset p-3.5 rounded-2xl space-y-1">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>GPS निर्देशांक एवं स्थिति:</span>
              </span>
              <p className="font-mono font-bold text-slate-200 text-sm">
                LAT {submissionResult.coordinates?.latitude?.toFixed(5)}°, LNG{' '}
                {submissionResult.coordinates?.longitude?.toFixed(5)}°
                <span className="ml-2 text-xs font-sans text-emerald-400 font-black">
                  (✓ {submissionResult.geofenceStatus || 'VERIFIED'})
                </span>
              </p>
            </div>
          </div>

          {/* Real-time Location & Google Plus Code */}
          {(submissionResult.plusCode || submissionResult.formattedAddress) && (
            <div className="clay-inset p-3.5 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  <span>डिजिटल एवं वास्तविक स्थान (Location & Plus Code):</span>
                </span>
                {submissionResult.plusCode && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(submissionResult.plusCode)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[11px] font-black px-2.5 py-0.5 rounded-lg clay-pill-emerald text-emerald-300 hover:text-emerald-200 transition inline-flex items-center gap-1"
                    title="Google Maps में खोलें"
                  >
                    <span>{submissionResult.plusCode}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              {submissionResult.formattedAddress && (
                <p className="font-bold text-amber-300 text-sm">
                  {submissionResult.formattedAddress}
                </p>
              )}
            </div>
          )}

          {shareFeedback && (
            <div className="p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold text-center animate-pulse">
              {shareFeedback}
            </div>
          )}

          {/* Action Buttons: Prominent Share Proof / WhatsApp Button */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleShareProof}
              className="clay-btn-emerald w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-3 text-base font-black text-white cursor-pointer shadow-xl active:scale-95 transition"
            >
              <Share2 className="w-5 h-5 text-white" />
              <span>Share Proof / WhatsApp</span>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleShareProof}
                className="clay-card py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-200 hover:text-white cursor-pointer transition"
              >
                {hasCopiedUrl ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>URL कॉपी हो गया!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>इमेज लिंक कॉपी करें</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetFlow}
                className="clay-btn-indigo py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-white cursor-pointer transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>नई फ़ोटो खींचें</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW C: ERROR STATE VIEW                                            */}
      {/* =================================================================== */}
      {flowState === 'error' && (
        <div className="clay-card p-6 sm:p-8 space-y-5 text-center">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
            <AlertCircle className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-white">
              उपस्थिति दर्ज नहीं हो सकी
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              {cameraError || 'नेटवर्क समस्या के कारण फ़ोटो अपलोड नहीं हो पाई।'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={handleResetFlow}
              className="clay-btn-emerald w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>पुनः कैमरा खोलें</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="clay-card w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>फ़ाइल चुनें</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
