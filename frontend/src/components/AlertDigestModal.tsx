import React from 'react';
import { DegradationAlert, Site } from '../types';
import { X, Mail, AlertTriangle, ShieldCheck, Info } from 'lucide-react';

interface AlertDigestModalProps {
  site: Site | null;
  alerts: DegradationAlert[];
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export const AlertDigestModal: React.FC<AlertDigestModalProps> = ({
  site,
  alerts,
  isOpen,
  onClose,
  userEmail = 'analyst@darukaa.earth',
}) => {
  if (!isOpen || !site) return null;

  const subjectLine = `[Darukaa Alert Digest] Canopy Degradation Notice for ${site.name}`;
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Alert Digest Email Preview
              </h2>
              <p className="text-xs text-slate-500">
                Mocked email digest template for site monitoring alerts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Banner */}
        <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Preview only — email service delivery is not yet configured for live
            sending.
          </span>
        </div>

        {/* Email Header / Metadata */}
        <div className="p-6 space-y-4 bg-slate-50/50 border-b border-slate-200 text-xs font-mono">
          <div className="flex">
            <span className="w-20 text-slate-400 font-semibold">To:</span>
            <span className="text-slate-700">{userEmail}</span>
          </div>
          <div className="flex">
            <span className="w-20 text-slate-400 font-semibold">From:</span>
            <span className="text-slate-700">
              alerts@darukaa.earth (Darukaa Automated Monitoring)
            </span>
          </div>
          <div className="flex">
            <span className="w-20 text-slate-400 font-semibold">Subject:</span>
            <span className="text-slate-800 font-bold">{subjectLine}</span>
          </div>
          <div className="flex">
            <span className="w-20 text-slate-400 font-semibold">Date:</span>
            <span className="text-slate-600">{currentDate}</span>
          </div>
        </div>

        {/* Email Content Body */}
        <div className="p-6 space-y-4 text-sm text-slate-700">
          <p>Hello Conservation Team,</p>
          <p>
            This automated alert digest summarizes recent telemetry anomalies
            detected for conservation site{' '}
            <strong className="text-slate-900">{site.name}</strong> (
            {site.area_hectares || 0} ha, {site.site_type}).
          </p>

          {alerts.length > 0 ? (
            <div className="space-y-3 my-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Active Degradation Events ({alerts.length})
              </h4>
              {alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-rose-50/80 border border-rose-200 rounded-lg space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-rose-800">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      {alert.metric_type.toUpperCase()} Drop Detected
                    </span>
                    <span className="text-rose-600 font-mono">
                      -{alert.drop_percentage.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    {alert.message}
                  </p>
                  <div className="flex justify-between text-slate-500 pt-1 border-t border-rose-200/60 font-mono">
                    <span>
                      Previous: {alert.previous_value} ({alert.previous_date})
                    </span>
                    <span>
                      Current: {alert.current_value} ({alert.recorded_at})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-3 text-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong>No Active Degradation Alerts</strong>
                <p className="text-emerald-700 mt-0.5">
                  Satellite canopy cover and NDVI density remain stable within
                  normal operating baseline threshold.
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500 pt-2">
            Please log in to the Darukaa.Earth dashboard to view high-resolution
            GIS maps and initiate field verification workflows if required.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors"
          >
            Close Digest
          </button>
        </div>
      </div>
    </div>
  );
};
