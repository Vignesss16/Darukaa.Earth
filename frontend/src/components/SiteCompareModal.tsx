import React, { useEffect, useState } from 'react';
import { Site, SiteCompareResult } from '../types';
import { api } from '../api';
import {
  X,
  AlertTriangle,
  Shield,
  TrendingUp,
  CheckCircle2,
  Circle,
  BarChart3,
  Trees,
  Scale,
  Activity,
  Sparkles,
  Info,
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
      // Pre-select first 2-3 sites by default if none selected
      setSelectedSiteIds((prev) => {
        if (prev.length >= 2) return prev;
        return sites.slice(0, 3).map((s) => s.id);
      });
    }
  }, [sites]);

  useEffect(() => {
    if (isOpen && selectedSiteIds.length >= 2) {
      fetchComparison();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (selectedSiteIds.length <= 2) return; // Keep at least 2 for comparison
      setSelectedSiteIds(selectedSiteIds.filter((sid) => sid !== id));
    } else {
      if (selectedSiteIds.length >= 3) return; // Max 3 side-by-side
      setSelectedSiteIds([...selectedSiteIds, id]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        overflowY: 'auto',
      }}
      className="print:hidden animate-in fade-in duration-200"
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          color: '#0f172a',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.35)',
          maxWidth: '1140px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background:
              'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #064e3b 100%)',
            padding: '20px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399',
              }}
            >
              <BarChart3 size={22} />
            </div>
            <div>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#ffffff',
                    letterSpacing: '-0.01em',
                    margin: 0,
                  }}
                >
                  Multi-Site Telemetry Comparison
                </h2>
                <span
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    color: '#6ee7b7',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  Side-by-Side
                </span>
              </div>
              <p
                style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  margin: '4px 0 0 0',
                }}
              >
                Benchmarking biomass, canopy health, area, and degradation
                alerts across 2–3 selected conservation reserves
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            className="hover:bg-white/20 hover:text-white"
            title="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Site Selector Pills Toolbar */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            padding: '14px 28px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginRight: '4px',
              }}
            >
              Select Sites (2–3):
            </span>
            {sites.map((s) => {
              const isSelected = selectedSiteIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSite(s.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: isSelected ? 600 : 500,
                    transition: 'all 0.15s ease',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                    color: isSelected ? '#065f46' : '#475569',
                    border: isSelected
                      ? '1.5px solid #10b981'
                      : '1px solid #cbd5e1',
                    boxShadow: isSelected
                      ? '0 2px 4px rgba(16, 185, 129, 0.12)'
                      : 'none',
                  }}
                  className="hover:border-emerald-400"
                >
                  {isSelected ? (
                    <CheckCircle2 size={14} className="text-emerald-600" />
                  ) : (
                    <Circle size={14} className="text-slate-400" />
                  )}
                  <span>{s.name}</span>
                </button>
              );
            })}
          </div>
          <span
            style={{
              fontSize: '11px',
              color: '#64748b',
              fontWeight: 600,
              backgroundColor: '#e2e8f0',
              padding: '3px 9px',
              borderRadius: '6px',
            }}
          >
            {selectedSiteIds.length} of {sites.length} selected
          </span>
        </div>

        {/* Scrollable Content Body */}
        <div
          style={{
            padding: '28px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '28px',
            backgroundColor: '#ffffff',
          }}
        >
          {loading ? (
            <div
              style={{
                padding: '64px 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '3px solid #10b981',
                  borderTopColor: 'transparent',
                }}
                className="animate-spin mb-3"
              />
              <p
                style={{ fontSize: '13px', fontWeight: 500, color: '#475569' }}
              >
                Analyzing multi-site telemetry & assembling comparative
                benchmarks...
              </p>
            </div>
          ) : error ? (
            <div
              style={{
                padding: '16px 20px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                color: '#b91c1c',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          ) : compareResult ? (
            <>
              {/* SECTION 1: SIDE-BY-SIDE SITE KPI CARDS */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <Sparkles size={16} className="text-emerald-600" />
                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0f172a',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      margin: 0,
                    }}
                  >
                    Site Executive Profiles
                  </h3>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${compareResult.sites.length}, minmax(0, 1fr))`,
                    gap: '20px',
                  }}
                >
                  {compareResult.sites.map((site) => {
                    const alertCount =
                      compareResult.active_alert_counts[site.id] || 0;
                    const metrics =
                      compareResult.metrics_by_site[site.id] || [];

                    const canopyMetrics = metrics.filter(
                      (m) => m.metric_type === 'canopy_cover'
                    );
                    const latestCanopy =
                      canopyMetrics.length > 0
                        ? canopyMetrics[canopyMetrics.length - 1].value
                        : null;

                    const carbonMetrics = metrics.filter(
                      (m) => m.metric_type === 'carbon_tons'
                    );
                    const latestCarbon =
                      carbonMetrics.length > 0
                        ? carbonMetrics[carbonMetrics.length - 1].value
                        : null;

                    return (
                      <div
                        key={site.id}
                        style={{
                          backgroundColor: '#f8fafc',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '14px',
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                          transition: 'all 0.2s ease',
                        }}
                        className="hover:shadow-md hover:border-emerald-300"
                      >
                        {/* Card Header */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid #e2e8f0',
                            paddingBottom: '14px',
                          }}
                        >
                          <div>
                            <h4
                              style={{
                                fontSize: '15px',
                                fontWeight: 700,
                                color: '#0f172a',
                                margin: '0 0 4px 0',
                                letterSpacing: '-0.01em',
                              }}
                            >
                              {site.name}
                            </h4>
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '11px',
                                fontWeight: 600,
                                textTransform: 'capitalize',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#ecfdf5',
                                color: '#047857',
                                border: '1px solid #a7f3d0',
                              }}
                            >
                              {site.site_type} Ecosystem
                            </span>
                          </div>

                          {/* Alert Indicator Badge */}
                          {alertCount > 0 ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 9px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fde68a',
                              }}
                            >
                              <AlertTriangle size={12} />
                              {alertCount} Alerts
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 9px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: '#ecfdf5',
                                color: '#065f46',
                                border: '1px solid #a7f3d0',
                              }}
                            >
                              <Shield size={12} />
                              Optimal (0)
                            </span>
                          )}
                        </div>

                        {/* Surface Area Banner */}
                        <div
                          style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '10px',
                            padding: '12px 16px',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <Scale size={16} className="text-slate-400" />
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              Mapped Area
                            </span>
                          </div>
                          <span
                            className="font-mono"
                            style={{
                              fontSize: '15px',
                              fontWeight: 700,
                              color: '#0f172a',
                            }}
                          >
                            {site.area_hectares != null
                              ? `${site.area_hectares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha`
                              : 'Uncalculated'}
                          </span>
                        </div>

                        {/* Dual Key Metrics */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px',
                          }}
                        >
                          {/* Canopy Box */}
                          <div
                            style={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: '#059669',
                              }}
                            >
                              <Trees size={14} />
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: '#64748b',
                                  textTransform: 'uppercase',
                                }}
                              >
                                Canopy
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: '18px',
                                fontWeight: 800,
                                color: '#065f46',
                                lineHeight: 1,
                              }}
                            >
                              {latestCanopy !== null
                                ? `${latestCanopy.toFixed(1)}%`
                                : 'N/A'}
                            </span>
                            {/* Visual Progress Bar */}
                            <div
                              style={{
                                height: '6px',
                                width: '100%',
                                backgroundColor: '#f1f5f9',
                                borderRadius: '3px',
                                overflow: 'hidden',
                                marginTop: '4px',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${Math.min(100, Math.max(0, latestCanopy || 0))}%`,
                                  background:
                                    'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                                  borderRadius: '3px',
                                }}
                              />
                            </div>
                          </div>

                          {/* Carbon Box */}
                          <div
                            style={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: '#2563eb',
                              }}
                            >
                              <Activity size={14} />
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: '#64748b',
                                  textTransform: 'uppercase',
                                }}
                              >
                                Carbon Stock
                              </span>
                            </div>
                            <span
                              className="font-mono"
                              style={{
                                fontSize: '18px',
                                fontWeight: 800,
                                color: '#1e3a8a',
                                lineHeight: 1,
                              }}
                            >
                              {latestCarbon !== null
                                ? `${Math.round(latestCarbon).toLocaleString()} t`
                                : 'N/A'}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                color: '#94a3b8',
                                marginTop: '4px',
                              }}
                            >
                              Estimated Biomass
                            </span>
                          </div>
                        </div>

                        {/* Historical Telemetry Sparkline */}
                        <div
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <TrendingUp
                                size={13}
                                className="text-emerald-600"
                              />
                              Canopy History
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#059669',
                              }}
                            >
                              {canopyMetrics.length > 0
                                ? `${canopyMetrics[canopyMetrics.length - 1].value.toFixed(1)}% latest`
                                : 'No data'}
                            </span>
                          </div>

                          {canopyMetrics.length > 0 ? (
                            <div
                              style={{
                                height: '56px',
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: '4px',
                                padding: '4px 0',
                              }}
                            >
                              {canopyMetrics.slice(-12).map((m, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    flex: 1,
                                    height: `${Math.min(100, Math.max(14, m.value))}%`,
                                    background:
                                      'linear-gradient(180deg, #34d399 0%, #059669 100%)',
                                    borderRadius: '3px 3px 0 0',
                                    transition: 'all 0.15s ease',
                                    cursor: 'pointer',
                                  }}
                                  className="hover:opacity-80"
                                  title={`Recorded ${new Date(m.recorded_at).toLocaleDateString()}: ${m.value}% cover`}
                                />
                              ))}
                            </div>
                          ) : (
                            <div
                              style={{
                                padding: '12px 0',
                                textAlign: 'center',
                                fontSize: '11px',
                                color: '#94a3b8',
                                fontStyle: 'italic',
                              }}
                            >
                              No telemetry series recorded yet
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: DETAILED COMPARATIVE MATRIX TABLE */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <Scale size={16} className="text-slate-600" />
                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0f172a',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      margin: 0,
                    }}
                  >
                    Structured Metrics Matrix
                  </h3>
                </div>

                <div
                  style={{
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                  }}
                >
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      textAlign: 'left',
                      fontSize: '13px',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: '#f1f5f9',
                          borderBottom: '1.5px solid #cbd5e1',
                        }}
                      >
                        <th
                          style={{
                            padding: '14px 20px',
                            fontWeight: 700,
                            color: '#334155',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            width: '25%',
                          }}
                        >
                          Telemetry Property
                        </th>
                        {compareResult.sites.map((site) => (
                          <th
                            key={site.id}
                            style={{
                              padding: '14px 20px',
                              fontWeight: 700,
                              color: '#0f172a',
                              fontSize: '13px',
                              borderLeft: '1px solid #e2e8f0',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <span>{site.name}</span>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 500,
                                  color: '#64748b',
                                  textTransform: 'capitalize',
                                }}
                              >
                                ({site.site_type})
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Row: Ecosystem Classification */}
                      <tr
                        style={{
                          backgroundColor: '#ffffff',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <td
                          style={{
                            padding: '14px 20px',
                            fontWeight: 600,
                            color: '#475569',
                            backgroundColor: '#f8fafc',
                          }}
                        >
                          Classification
                        </td>
                        {compareResult.sites.map((site) => (
                          <td
                            key={site.id}
                            style={{
                              padding: '14px 20px',
                              borderLeft: '1px solid #e2e8f0',
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                textTransform: 'capitalize',
                                backgroundColor: '#f0fdf4',
                                color: '#166534',
                                border: '1px solid #bbf7d0',
                              }}
                            >
                              {site.site_type}
                            </span>
                          </td>
                        ))}
                      </tr>

                      {/* Row: Total Land Surface Area */}
                      <tr
                        style={{
                          backgroundColor: '#ffffff',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <td
                          style={{
                            padding: '14px 20px',
                            fontWeight: 600,
                            color: '#475569',
                            backgroundColor: '#f8fafc',
                          }}
                        >
                          Total Land Area
                        </td>
                        {compareResult.sites.map((site) => (
                          <td
                            key={site.id}
                            className="font-mono"
                            style={{
                              padding: '14px 20px',
                              fontWeight: 700,
                              color: '#0f172a',
                              borderLeft: '1px solid #e2e8f0',
                            }}
                          >
                            {site.area_hectares != null
                              ? `${site.area_hectares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha`
                              : 'N/A'}
                          </td>
                        ))}
                      </tr>

                      {/* Row: Active Degradation Alerts */}
                      <tr
                        style={{
                          backgroundColor: '#ffffff',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <td
                          style={{
                            padding: '14px 20px',
                            fontWeight: 600,
                            color: '#475569',
                            backgroundColor: '#f8fafc',
                          }}
                        >
                          Active Alerts
                        </td>
                        {compareResult.sites.map((site) => {
                          const alertCount =
                            compareResult.active_alert_counts[site.id] || 0;
                          return (
                            <td
                              key={site.id}
                              style={{
                                padding: '14px 20px',
                                borderLeft: '1px solid #e2e8f0',
                              }}
                            >
                              {alertCount > 0 ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor: '#fffbeb',
                                    color: '#b45309',
                                    border: '1px solid #fde68a',
                                  }}
                                >
                                  <AlertTriangle size={13} />
                                  {alertCount} Active Alert
                                  {alertCount > 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    backgroundColor: '#f0fdf4',
                                    color: '#15803d',
                                    border: '1px solid #bbf7d0',
                                  }}
                                >
                                  <Shield size={13} />
                                  Optimal (0 Alerts)
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Row: Latest Canopy Cover */}
                      <tr
                        style={{
                          backgroundColor: '#ffffff',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <td
                          style={{
                            padding: '14px 20px',
                            fontWeight: 600,
                            color: '#475569',
                            backgroundColor: '#f8fafc',
                          }}
                        >
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
                              style={{
                                padding: '14px 20px',
                                borderLeft: '1px solid #e2e8f0',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                }}
                              >
                                <span
                                  className="font-mono"
                                  style={{
                                    fontWeight: 700,
                                    color: '#047857',
                                    fontSize: '14px',
                                  }}
                                >
                                  {latest !== null
                                    ? `${latest.toFixed(1)}%`
                                    : 'No data'}
                                </span>
                                {latest !== null && (
                                  <div
                                    style={{
                                      width: '60px',
                                      height: '6px',
                                      backgroundColor: '#e2e8f0',
                                      borderRadius: '3px',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <div
                                      style={{
                                        height: '100%',
                                        width: `${Math.min(100, Math.max(0, latest))}%`,
                                        backgroundColor: '#10b981',
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Row: Stored Carbon Stock */}
                      <tr
                        style={{
                          backgroundColor: '#ffffff',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <td
                          style={{
                            padding: '14px 20px',
                            fontWeight: 600,
                            color: '#475569',
                            backgroundColor: '#f8fafc',
                          }}
                        >
                          Stored Carbon Stock
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
                              className="font-mono"
                              style={{
                                padding: '14px 20px',
                                borderLeft: '1px solid #e2e8f0',
                                fontWeight: 700,
                                color: '#1d4ed8',
                              }}
                            >
                              {latest !== null
                                ? `${Math.round(latest).toLocaleString()} t CO₂`
                                : 'N/A'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Row: Telemetry Records */}
                      <tr style={{ backgroundColor: '#ffffff' }}>
                        <td
                          style={{
                            padding: '14px 20px',
                            fontWeight: 600,
                            color: '#475569',
                            backgroundColor: '#f8fafc',
                          }}
                        >
                          Sensor Timeline Samples
                        </td>
                        {compareResult.sites.map((site) => {
                          const metrics =
                            compareResult.metrics_by_site[site.id] || [];
                          return (
                            <td
                              key={site.id}
                              className="font-mono"
                              style={{
                                padding: '14px 20px',
                                borderLeft: '1px solid #e2e8f0',
                                color: '#64748b',
                                fontSize: '12px',
                              }}
                            >
                              {metrics.length} telemetry points
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            padding: '16px 28px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: '#64748b',
            }}
          >
            <Info size={13} className="text-emerald-600" />
            <span>
              Real-time spatial benchmarking synced with Sentinel-2
              multispectral telemetry & local PostGIS metrics.
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)',
            }}
            className="hover:bg-slate-800 active:scale-95"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
