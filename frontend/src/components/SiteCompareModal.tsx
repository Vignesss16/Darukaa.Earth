import React, { useEffect, useState } from 'react';
import { Site, SiteCompareResult } from '../types';
import { api } from '../api';
import {
  X,
  Layers,
  AlertTriangle,
  Shield,
  TrendingUp,
  CheckSquare,
  Square,
} from 'lucide-react';

interface SiteCompareModalProps {
  sites: Site[];
  isOpen: boolean;
  onClose: () => void;
}

export const SiteCompareModal: React.FC<SiteCompareModalProps> = ({
  sites,
  isOpen,
  onClose,
}) => {
  const [selectedSiteIds, setSelectedSiteIds] = useState<number[]>([]);
  const [compareResult, setCompareResult] = useState<SiteCompareResult | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sites.length >= 2) {
      // Pre-select first 2-3 sites by default
      const initialIds = sites.slice(0, 3).map((s) => s.id);
      setSelectedSiteIds(initialIds);
    }
  }, [sites]);

  useEffect(() => {
    if (isOpen && selectedSiteIds.length >= 2) {
      fetchComparison();
    }
  }, [isOpen, selectedSiteIds]);

  const fetchComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.sites.compare(selectedSiteIds);
      setCompareResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to compare sites');
    } finally {
      setLoading(false);
    }
  };

  const toggleSite = (id: number) => {
    if (selectedSiteIds.includes(id)) {
      if (selectedSiteIds.length <= 2) return; // Keep at least 2
      setSelectedSiteIds(selectedSiteIds.filter((sid) => sid !== id));
    } else {
      if (selectedSiteIds.length >= 3) return; // Max 3
      setSelectedSiteIds([...selectedSiteIds, id]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Multi-Site Comparison
              </h2>
              <p className="text-xs text-slate-500">
                Compare 2 to 3 sites side-by-side (NDVI, Canopy, Area, Alerts)
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

        {/* Site Selector Pills */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 mr-2 uppercase tracking-wider">
            Select Sites (2-3):
          </span>
          {sites.map((s) => {
            const isSelected = selectedSiteIds.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggleSite(s.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isSelected
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {isSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                {s.name}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm">
                Analyzing telemetry and compiling side-by-side metrics...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
              {error}
            </div>
          ) : compareResult ? (
            <div className="space-y-6">
              {/* Comparative Matrix Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                    <tr>
                      <th className="p-3 w-1/4">Metric / Property</th>
                      {compareResult.sites.map((site) => (
                        <th
                          key={site.id}
                          className="p-3 font-bold text-slate-800 border-l border-slate-200"
                        >
                          {site.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr>
                      <td className="p-3 text-slate-500 bg-slate-50/50">
                        Classification
                      </td>
                      {compareResult.sites.map((site) => (
                        <td
                          key={site.id}
                          className="p-3 capitalize border-l border-slate-200"
                        >
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                            {site.site_type}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 text-slate-500 bg-slate-50/50">
                        Area (Hectares)
                      </td>
                      {compareResult.sites.map((site) => (
                        <td
                          key={site.id}
                          className="p-3 border-l border-slate-200 font-mono text-slate-700"
                        >
                          {site.area_hectares != null
                            ? `${site.area_hectares.toFixed(2)} ha`
                            : 'N/A'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 text-slate-500 bg-slate-50/50">
                        Active Alerts
                      </td>
                      {compareResult.sites.map((site) => {
                        const alertCount =
                          compareResult.active_alert_counts[site.id] || 0;
                        return (
                          <td
                            key={site.id}
                            className="p-3 border-l border-slate-200"
                          >
                            {alertCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                                <AlertTriangle className="w-3 h-3" />
                                {alertCount} Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Shield className="w-3 h-3" />
                                Healthy (0)
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="p-3 text-slate-500 bg-slate-50/50">
                        Latest Canopy Cover
                      </td>
                      {compareResult.sites.map((site) => {
                        const metrics =
                          compareResult.metrics_by_site[site.id] || [];
                        const canopyVals = metrics.filter(
                          (m) => m.metric_type === 'canopy_cover'
                        );
                        const latest =
                          canopyVals.length > 0
                            ? canopyVals[canopyVals.length - 1].value
                            : null;
                        return (
                          <td
                            key={site.id}
                            className="p-3 border-l border-slate-200 font-bold text-slate-800"
                          >
                            {latest !== null
                              ? `${latest.toFixed(1)}%`
                              : 'No data'}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="p-3 text-slate-500 bg-slate-50/50">
                        Stored Carbon Estimate
                      </td>
                      {compareResult.sites.map((site) => {
                        const metrics =
                          compareResult.metrics_by_site[site.id] || [];
                        const carbonVals = metrics.filter(
                          (m) => m.metric_type === 'carbon_tons'
                        );
                        const latest =
                          carbonVals.length > 0
                            ? carbonVals[carbonVals.length - 1].value
                            : null;
                        return (
                          <td
                            key={site.id}
                            className="p-3 border-l border-slate-200 font-mono text-emerald-700"
                          >
                            {latest !== null
                              ? `${latest.toLocaleString()} t`
                              : 'N/A'}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Side-by-Side Canopy / NDVI Visual Cards */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Canopy Density Telemetry Comparison
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {compareResult.sites.map((site) => {
                    const metrics =
                      compareResult.metrics_by_site[site.id] || [];
                    const canopyVals = metrics.filter(
                      (m) => m.metric_type === 'canopy_cover'
                    );

                    return (
                      <div
                        key={site.id}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3"
                      >
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                          <h4 className="font-semibold text-slate-800 text-sm">
                            {site.name}
                          </h4>
                          <span className="text-xs text-slate-500 font-mono">
                            {site.site_type}
                          </span>
                        </div>
                        {canopyVals.length > 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span>Trend (Recent):</span>
                              <span className="font-bold text-emerald-700">
                                {canopyVals[
                                  canopyVals.length - 1
                                ].value.toFixed(1)}
                                % Cover
                              </span>
                            </div>
                            <div className="h-16 flex items-end gap-1 bg-white p-2 rounded border border-slate-200">
                              {canopyVals.slice(-10).map((m, idx) => (
                                <div
                                  key={idx}
                                  className="flex-1 bg-emerald-500 rounded-t hover:bg-emerald-600 transition-colors"
                                  style={{
                                    height: `${Math.min(100, Math.max(10, m.value))}%`,
                                  }}
                                  title={`${m.recorded_at}: ${m.value}%`}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic py-4 text-center">
                            No telemetry metrics seeded yet
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
