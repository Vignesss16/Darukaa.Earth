import React, { useEffect, useState } from 'react';
import { Project, ProjectSummaryResult } from '../types';
import { api } from '../api';
import {
  X,
  Download,
  Printer,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface ProjectExportModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectExportModal: React.FC<ProjectExportModalProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  const [summary, setSummary] = useState<ProjectSummaryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && project?.id) {
      fetchSummary();
    }
  }, [isOpen, project?.id]);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.projects.getSummary(project.id);
      setSummary(res);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate project summary'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!summary) return;
    const headers = [
      'Site ID',
      'Site Name',
      'Classification',
      'Area (ha)',
      'Active Alerts',
      'Latest Canopy Cover (%)',
    ];
    const rows = summary.sites.map((s) => [
      s.id,
      `"${s.name.replace(/"/g, '""')}"`,
      s.site_type,
      s.area_hectares,
      s.alert_count,
      s.latest_canopy_cover ?? 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${summary.project_name.toLowerCase().replace(/\s+/g, '_')}_summary.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintSummary = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Project Portfolio Summary
              </h2>
              <p className="text-xs text-slate-500">
                {project.name} • Executive Rollup Report
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

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm">Generating portfolio summary rollup...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
              {error}
            </div>
          ) : summary ? (
            <div className="space-y-6 print:space-y-4">
              {/* Executive Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs font-semibold text-slate-500 uppercase">
                    Total Sites
                  </div>
                  <div className="text-2xl font-bold text-slate-800 mt-1">
                    {summary.total_sites}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs font-semibold text-slate-500 uppercase">
                    Total Area
                  </div>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">
                    {summary.total_area_hectares.toFixed(1)}{' '}
                    <span className="text-xs font-normal">ha</span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs font-semibold text-slate-500 uppercase">
                    Active Alerts
                  </div>
                  <div className="text-2xl font-bold text-amber-600 mt-1 flex items-center gap-1.5">
                    {summary.total_active_alerts}
                    {summary.total_active_alerts > 0 && (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs font-semibold text-slate-500 uppercase">
                    Project Health
                  </div>
                  <div className="text-sm font-bold text-emerald-700 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {summary.total_active_alerts === 0
                      ? 'Optimal (100%)'
                      : 'Monitoring Active'}
                  </div>
                </div>
              </div>

              {/* Ecosystem Breakdown */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-lg">
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                  Ecosystem Classification Breakdown
                </h4>
                <div className="flex flex-wrap gap-4 text-xs">
                  {Object.entries(summary.site_type_counts).map(
                    ([type, count]) => (
                      <div
                        key={type}
                        className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-emerald-200"
                      >
                        <span className="capitalize font-semibold text-slate-700">
                          {type}:
                        </span>
                        <span className="font-bold text-emerald-700">
                          {count} site(s)
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Site Table */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3">
                  Conservation Sites Rollup
                </h3>
                <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Site Name</th>
                        <th className="p-3">Classification</th>
                        <th className="p-3 text-right">Area (ha)</th>
                        <th className="p-3 text-right">Latest Canopy</th>
                        <th className="p-3 text-center">Alert Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {summary.sites.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-800">
                            {s.name}
                          </td>
                          <td className="p-3 capitalize">{s.site_type}</td>
                          <td className="p-3 text-right font-mono text-slate-700">
                            {s.area_hectares
                              ? s.area_hectares.toFixed(2)
                              : '0.00'}
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-700">
                            {s.latest_canopy_cover !== null
                              ? `${s.latest_canopy_cover.toFixed(1)}%`
                              : 'N/A'}
                          </td>
                          <td className="p-3 text-center">
                            {s.alert_count > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                {s.alert_count} Alert(s)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                Normal
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleDownloadCSV}
            disabled={!summary}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Download CSV Report
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintSummary}
              disabled={!summary}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Summary
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
