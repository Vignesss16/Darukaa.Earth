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

  const sitesList = summary?.site_summaries || summary?.sites || [];
  const classificationCounts =
    summary?.sites_by_classification || summary?.site_type_counts || {};

  const handleDownloadCSV = () => {
    if (!summary) return;
    const headers = [
      'Site ID',
      'Site Name',
      'Classification',
      'Area (ha)',
      'Active Alerts',
      'Latest Canopy Cover (%)',
      'Health Status',
    ];
    const rows = sitesList.map((s) => [
      s.site_id ?? s.id ?? '',
      `"${(s.name || '').replace(/"/g, '""')}"`,
      s.site_type || 'mixed',
      (s.area_hectares || 0).toFixed(2),
      s.active_alert_count ?? s.alert_count ?? 0,
      s.latest_canopy_cover !== null && s.latest_canopy_cover !== undefined
        ? s.latest_canopy_cover.toFixed(1)
        : 'N/A',
      s.health_status || 'Healthy',
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
      `${(summary.project_name || 'project').toLowerCase().replace(/\s+/g, '_')}_summary.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintSummary = () => {
    if (!summary) return;
    const originalTitle = document.title;
    document.title = `${(project.name || 'Project').replace(/\s+/g, '_')}_Portfolio_Dossier`;
    document.body.classList.add('printing-project-dossier');
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
      document.body.classList.remove('printing-project-dossier');
    }, 1000);
  };

  if (!isOpen) return null;

  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. Interactive On-Screen Modal Dialog (Hidden during print)               */}
      {/* ========================================================================= */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          overflowY: 'auto',
        }}
        className="print:hidden animate-in fade-in duration-150"
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '820px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid #E2E8F0',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #064E3B 0%, #0F172A 100%)',
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#34D399',
                }}
              >
                <FileText size={20} />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: '17px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    margin: 0,
                  }}
                >
                  Project Portfolio Summary
                </h2>
                <p
                  style={{
                    fontSize: '12px',
                    color: '#94A3B8',
                    margin: '2px 0 0 0',
                  }}
                >
                  {project.name} • Executive Environmental Rollup
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px',
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div
            style={{
              padding: '24px',
              maxHeight: '70vh',
              overflowY: 'auto',
            }}
          >
            {loading ? (
              <div
                style={{
                  padding: '48px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '3px solid #10B981',
                    borderTopColor: 'transparent',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '12px',
                  }}
                />
                <p style={{ fontSize: '13px', margin: 0 }}>
                  Compiling portfolio analytics and satellite metrics...
                </p>
              </div>
            ) : error ? (
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#B91C1C',
                  borderRadius: '8px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <AlertTriangle size={18} color="#DC2626" />
                <span>{error}</span>
              </div>
            ) : summary ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
              >
                {/* Executive Metrics Cards */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '14px',
                  }}
                >
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '12px 14px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#64748B',
                        textTransform: 'uppercase',
                      }}
                    >
                      Total Sites
                    </div>
                    <div
                      style={{
                        fontSize: '22px',
                        fontWeight: 800,
                        color: '#0F172A',
                        marginTop: '4px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {summary.total_sites || 0}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '12px 14px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#64748B',
                        textTransform: 'uppercase',
                      }}
                    >
                      Monitored Area
                    </div>
                    <div
                      style={{
                        fontSize: '22px',
                        fontWeight: 800,
                        color: '#059669',
                        marginTop: '4px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {(summary.total_area_hectares || 0).toLocaleString()}{' '}
                      <span style={{ fontSize: '12px', fontWeight: 500 }}>
                        ha
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '12px 14px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#64748B',
                        textTransform: 'uppercase',
                      }}
                    >
                      Active Alerts
                    </div>
                    <div
                      style={{
                        fontSize: '22px',
                        fontWeight: 800,
                        color:
                          (summary.total_active_alerts || 0) > 0
                            ? '#D97706'
                            : '#059669',
                        marginTop: '4px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {summary.total_active_alerts || 0}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '12px 14px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#64748B',
                        textTransform: 'uppercase',
                      }}
                    >
                      Portfolio Health
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color:
                          (summary.total_active_alerts || 0) === 0
                            ? '#059669'
                            : '#D97706',
                        marginTop: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircle2 size={14} />
                      <span>
                        {(summary.total_active_alerts || 0) === 0
                          ? 'Nominal (100%)'
                          : 'Alerts Active'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ecosystem Classification Breakdown */}
                <div
                  style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '8px',
                    padding: '12px 16px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#166534',
                      letterSpacing: '0.04em',
                      marginBottom: '8px',
                    }}
                  >
                    Ecosystem Classification Breakdown
                  </div>
                  <div
                    style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
                  >
                    {Object.entries(classificationCounts).map(
                      ([type, count]) => (
                        <div
                          key={type}
                          style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #86EFAC',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span
                            style={{
                              textTransform: 'capitalize',
                              color: '#334155',
                              fontWeight: 500,
                            }}
                          >
                            {type}:
                          </span>
                          <span
                            style={{
                              fontWeight: 700,
                              color: '#059669',
                              fontFamily: 'monospace',
                            }}
                          >
                            {count} {count === 1 ? 'site' : 'sites'}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Sites Table */}
                <div>
                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#1E293B',
                      marginBottom: '10px',
                    }}
                  >
                    Registered Conservation Sites ({sitesList.length})
                  </h3>
                  <div
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      overflow: 'hidden',
                    }}
                  >
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '12px',
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            backgroundColor: '#F8FAFC',
                            borderBottom: '1px solid #E2E8F0',
                            color: '#475569',
                            textAlign: 'left',
                            fontWeight: 600,
                          }}
                        >
                          <th style={{ padding: '10px 14px' }}>Site Name</th>
                          <th style={{ padding: '10px 14px' }}>
                            Classification
                          </th>
                          <th
                            style={{ padding: '10px 14px', textAlign: 'right' }}
                          >
                            Area (ha)
                          </th>
                          <th
                            style={{ padding: '10px 14px', textAlign: 'right' }}
                          >
                            Canopy Cover
                          </th>
                          <th
                            style={{
                              padding: '10px 14px',
                              textAlign: 'center',
                            }}
                          >
                            Alerts
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sitesList.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              style={{
                                padding: '24px',
                                textAlign: 'center',
                                color: '#94A3B8',
                              }}
                            >
                              No conservation sites registered under this
                              project yet.
                            </td>
                          </tr>
                        ) : (
                          sitesList.map((s, idx) => (
                            <tr
                              key={s.site_id ?? s.id ?? idx}
                              style={{
                                borderBottom:
                                  idx < sitesList.length - 1
                                    ? '1px solid #F1F5F9'
                                    : 'none',
                                backgroundColor:
                                  idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                              }}
                            >
                              <td
                                style={{
                                  padding: '10px 14px',
                                  fontWeight: 600,
                                  color: '#1E293B',
                                }}
                              >
                                {s.name}
                              </td>
                              <td
                                style={{
                                  padding: '10px 14px',
                                  textTransform: 'capitalize',
                                  color: '#64748B',
                                }}
                              >
                                {s.site_type}
                              </td>
                              <td
                                style={{
                                  padding: '10px 14px',
                                  textAlign: 'right',
                                  fontFamily: 'monospace',
                                  color: '#0F172A',
                                }}
                              >
                                {(s.area_hectares || 0).toFixed(2)}
                              </td>
                              <td
                                style={{
                                  padding: '10px 14px',
                                  textAlign: 'right',
                                  fontWeight: 600,
                                  color:
                                    s.latest_canopy_cover !== null &&
                                    s.latest_canopy_cover !== undefined
                                      ? '#059669'
                                      : '#94A3B8',
                                }}
                              >
                                {s.latest_canopy_cover !== null &&
                                s.latest_canopy_cover !== undefined
                                  ? `${s.latest_canopy_cover.toFixed(1)}%`
                                  : 'N/A'}
                              </td>
                              <td
                                style={{
                                  padding: '10px 14px',
                                  textAlign: 'center',
                                }}
                              >
                                {(s.active_alert_count ?? s.alert_count ?? 0) >
                                0 ? (
                                  <span
                                    style={{
                                      backgroundColor: '#FEF3C7',
                                      color: '#B45309',
                                      padding: '2px 8px',
                                      borderRadius: '9999px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {s.active_alert_count ?? s.alert_count}{' '}
                                    Alert(s)
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      backgroundColor: '#DCFCE7',
                                      color: '#15803D',
                                      padding: '2px 8px',
                                      borderRadius: '9999px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    Nominal
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: '14px 24px',
              backgroundColor: '#F8FAFC',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <button
              onClick={handleDownloadCSV}
              disabled={!summary}
              className="btn-canopy"
              style={{
                height: '34px',
                fontSize: '12px',
                padding: '0 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Download size={14} />
              <span>Download CSV Report</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handlePrintSummary}
                disabled={!summary}
                className="btn-secondary"
                style={{
                  height: '34px',
                  fontSize: '12px',
                  padding: '0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Printer size={14} />
                <span>Print Dossier</span>
              </button>
              <button
                onClick={onClose}
                className="btn-primary"
                style={{
                  height: '34px',
                  fontSize: '12px',
                  padding: '0 16px',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Dedicated Single-Page Executive Dossier Template (Shown ONLY in Print) */}
      {/* ========================================================================= */}
      {summary && (
        <div
          className="hidden print:block printable-project-dossier font-sans"
          style={{
            width: '100%',
            maxWidth: '210mm',
            margin: '0 auto',
            padding: '22px 24px',
            boxSizing: 'border-box',
            backgroundColor: '#FFFFFF',
            fontFamily: "'Inter', -apple-system, sans-serif",
            position: 'relative',
          }}
        >
          {/* Vibrant Hero Header Banner */}
          <div
            style={{
              background:
                'linear-gradient(135deg, #064E3B 0%, #065F46 35%, #0F766E 70%, #0F172A 100%)',
              borderRadius: '14px',
              padding: '18px 22px',
              color: '#FFFFFF',
              marginBottom: '16px',
              boxShadow: '0 4px 14px rgba(6, 78, 59, 0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '9999px',
                      backgroundColor: '#86EFAC',
                      boxShadow: '0 0 8px #86EFAC',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#A7F3D0',
                    }}
                  >
                    Darukaa.Earth Planetary Ops • Portfolio Rollup Dossier
                  </span>
                </div>
                <h1
                  style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    margin: '0 0 6px 0',
                    color: '#FFFFFF',
                  }}
                >
                  {project.name}
                </h1>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '11px',
                    color: '#D1FAE5',
                  }}
                >
                  <span
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#FFFFFF',
                    }}
                  >
                    {project.status || 'Active'}
                  </span>
                  <span>
                    Total Sites:{' '}
                    <strong>{summary.total_sites || 0} parcels</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Monitored Surface:{' '}
                    <strong>
                      {(summary.total_area_hectares || 0).toLocaleString()} ha
                    </strong>
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#86EFAC',
                    marginBottom: '4px',
                  }}
                >
                  REF: PRJ-00{project.id}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: '#E0F2FE',
                    fontFamily: 'monospace',
                  }}
                >
                  {reportDate}
                </div>
              </div>
            </div>
          </div>

          {/* 4 Colorful KPI Metric Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                backgroundColor: '#ECFDF5',
                border: '2px solid #10B981',
                borderRadius: '12px',
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#047857',
                }}
              >
                Total Parcels
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#064E3B',
                  marginTop: '4px',
                  fontFamily: 'monospace',
                }}
              >
                {summary.total_sites || 0} Sites
              </div>
              <div
                style={{ fontSize: '10px', color: '#059669', marginTop: '2px' }}
              >
                Monitored Boundaries
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: '2px solid #3B82F6',
                borderRadius: '12px',
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#1D4ED8',
                }}
              >
                Monitored Area
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#1E3A8A',
                  marginTop: '4px',
                  fontFamily: 'monospace',
                }}
              >
                {(summary.total_area_hectares || 0).toLocaleString()} ha
              </div>
              <div
                style={{ fontSize: '10px', color: '#2563EB', marginTop: '2px' }}
              >
                PostGIS Aggregation
              </div>
            </div>

            <div
              style={{
                backgroundColor:
                  (summary.total_active_alerts || 0) > 0
                    ? '#FEF2F2'
                    : '#F0FDF4',
                border:
                  (summary.total_active_alerts || 0) > 0
                    ? '2px solid #EF4444'
                    : '2px solid #22C55E',
                borderRadius: '12px',
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color:
                    (summary.total_active_alerts || 0) > 0
                      ? '#B91C1C'
                      : '#15803D',
                }}
              >
                Degradation Alerts
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color:
                    (summary.total_active_alerts || 0) > 0
                      ? '#991B1B'
                      : '#166534',
                  marginTop: '4px',
                  fontFamily: 'monospace',
                }}
              >
                {summary.total_active_alerts || 0} Events
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color:
                    (summary.total_active_alerts || 0) > 0
                      ? '#DC2626'
                      : '#16A34A',
                  marginTop: '2px',
                }}
              >
                Sentinel-2 Optical Telemetry
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#F0FDFA',
                border: '2px solid #14B8A6',
                borderRadius: '12px',
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#0F766E',
                }}
              >
                Portfolio Status
              </div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  color: '#134E4A',
                  marginTop: '6px',
                }}
              >
                {(summary.total_active_alerts || 0) === 0
                  ? 'Optimal (100%)'
                  : 'Monitoring Active'}
              </div>
              <div
                style={{ fontSize: '10px', color: '#0D9488', marginTop: '2px' }}
              >
                Autonomous Surveillance
              </div>
            </div>
          </div>

          {/* Ecosystem Classification Breakdown Card */}
          <div
            style={{
              backgroundColor: '#F0FDF4',
              border: '1.5px solid #BBF7D0',
              borderRadius: '12px',
              padding: '10px 14px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#166534',
                letterSpacing: '0.05em',
              }}
            >
              Ecosystem Classification Breakdown
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {Object.entries(classificationCounts).map(([type, count]) => (
                <div
                  key={type}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #86EFAC',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span
                    style={{
                      textTransform: 'capitalize',
                      color: '#334155',
                      fontWeight: 600,
                    }}
                  >
                    {type}:
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: '#059669',
                      fontFamily: 'monospace',
                    }}
                  >
                    {count} {count === 1 ? 'site' : 'sites'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sites Table */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1.5px solid #E2E8F0',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                backgroundColor: '#064E3B',
                color: '#FFFFFF',
                padding: '8px 14px',
                fontWeight: 700,
                fontSize: '10px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Conservation Parcels Registry & Telemetry Status</span>
              <span style={{ color: '#86EFAC' }}>
                {sitesList.length} Registered Sites
              </span>
            </div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '10.5px',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#F1F5F9',
                    borderBottom: '1px solid #E2E8F0',
                    color: '#475569',
                    fontWeight: 700,
                    textAlign: 'left',
                  }}
                >
                  <th style={{ padding: '6px 12px' }}>Site Name</th>
                  <th style={{ padding: '6px 12px' }}>Classification</th>
                  <th style={{ padding: '6px 12px', textAlign: 'right' }}>
                    Area (ha)
                  </th>
                  <th style={{ padding: '6px 12px', textAlign: 'right' }}>
                    Latest Canopy
                  </th>
                  <th style={{ padding: '6px 12px', textAlign: 'center' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {sitesList.map((s, idx) => (
                  <tr
                    key={s.site_id ?? s.id ?? idx}
                    style={{
                      borderBottom:
                        idx < sitesList.length - 1
                          ? '1px solid #E2E8F0'
                          : 'none',
                      backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                    }}
                  >
                    <td
                      style={{
                        padding: '6px 12px',
                        fontWeight: 700,
                        color: '#0F172A',
                      }}
                    >
                      {s.name}
                    </td>
                    <td
                      style={{
                        padding: '6px 12px',
                        textTransform: 'capitalize',
                        color: '#475569',
                      }}
                    >
                      {s.site_type}
                    </td>
                    <td
                      style={{
                        padding: '6px 12px',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        color: '#0F172A',
                      }}
                    >
                      {(s.area_hectares || 0).toFixed(2)}
                    </td>
                    <td
                      style={{
                        padding: '6px 12px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color:
                          s.latest_canopy_cover !== null &&
                          s.latest_canopy_cover !== undefined
                            ? '#059669'
                            : '#94A3B8',
                      }}
                    >
                      {s.latest_canopy_cover !== null &&
                      s.latest_canopy_cover !== undefined
                        ? `${s.latest_canopy_cover.toFixed(1)}%`
                        : 'N/A'}
                    </td>
                    <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                      {(s.active_alert_count ?? s.alert_count ?? 0) > 0 ? (
                        <span
                          style={{
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '9.5px',
                            fontWeight: 700,
                          }}
                        >
                          {s.active_alert_count ?? s.alert_count} Alert(s)
                        </span>
                      ) : (
                        <span
                          style={{
                            backgroundColor: '#DCFCE7',
                            color: '#166534',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '9.5px',
                            fontWeight: 700,
                          }}
                        >
                          Nominal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer with Gradient Bar & Official Certifications */}
          <div
            style={{
              borderTop: '2px solid transparent',
              borderImage:
                'linear-gradient(90deg, #10B981, #06B6D4, #3B82F6) 1',
              paddingTop: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '9.5px',
              color: '#64748B',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '7px',
                  height: '7px',
                  borderRadius: '9999px',
                  backgroundColor: '#10B981',
                }}
              />
              <span style={{ fontWeight: 700, color: '#064E3B' }}>
                Darukaa.Earth Planetary Ops Console
              </span>
              <span>• Certified Autonomous Telemetry Report</span>
            </div>
            <div
              style={{
                fontWeight: 700,
                color: '#0F172A',
                fontFamily: 'monospace',
              }}
            >
              ISO 14064-2 Compliant • Portfolio Audit Dossier • Page 1 of 1
            </div>
          </div>
        </div>
      )}
    </>
  );
};
