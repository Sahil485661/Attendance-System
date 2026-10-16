import React from 'react';
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react';

export default function BackendStatusBanner({ onRetry, isChecking }) {
  return (
    <div className="mb-6 sm:mb-8 p-4 sm:p-6 clay-card border border-amber-500/30 text-amber-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-11 sm:h-11 clay-pill-amber flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
          </div>
          <div>
            <h4 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
              सर्वर से कनेक्शन नहीं हो पाया (Backend Offline)
            </h4>
            <p className="text-xs text-amber-200/90 mt-1 leading-relaxed font-medium">
              कृपया सुनिश्चित करें कि आपका Express बैकएंड सर्वर <code className="px-1.5 py-0.5 rounded-lg bg-black/60 text-amber-300 font-mono text-[11px] border border-amber-500/20">http://localhost:3000</code> पर चालू है।
            </p>
            <div className="mt-2.5 flex items-center gap-2 text-[11px] text-amber-300 font-mono clay-inset px-3 py-1.5 w-fit max-w-full overflow-x-auto">
              <Terminal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">cd Backend &amp;&amp; node server.js</span>
            </div>
          </div>
        </div>

        <button
          onClick={onRetry}
          disabled={isChecking}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 clay-btn-dark text-amber-300 hover:text-white font-bold text-xs transition disabled:opacity-50 shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-amber-400' : ''}`} />
          <span>पुनः प्रयास करें (Retry)</span>
        </button>
      </div>
    </div>
  );
}
