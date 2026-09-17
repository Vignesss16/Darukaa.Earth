import React, { useEffect, useState } from 'react';
import {
  Site,
  Project,
  UserRole,
  SiteMetric,
  DegradationAlert,
  AssistantChatResponse,
} from '../types';
import { api } from '../api';
import { SiteMetricsChart } from './SiteMetricsChart';
import { AlertBanner } from './AlertBanner';
import { AlertDigestModal } from './AlertDigestModal';
import {
  X,
  Calendar,
  Trash2,
  Globe,
  Trees,
  LineChart,
  RefreshCw,
  Info,
  History,
  Printer,
  Bot,
  Send,
  Mail,
  Sparkles,
} from 'lucide-react';

interface SiteDetailPanelProps {
  site: Site | null;
  projects: Project[];
  onClose: () => void;
  onDeleteSite: (id: number) => void;
  userRole?: UserRole;
}

export const SiteDetailPanel: React.FC<SiteDetailPanelProps> = ({
  site,
  projects,
  onClose,
  onDeleteSite,
  userRole,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'analytics' | 'history' | 'assistant'
  >('overview');
  const [metrics, setMetrics] = useState<SiteMetric[]>([]);
  const [siteAlerts, setSiteAlerts] = useState<DegradationAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [digestModalOpen, setDigestModalOpen] = useState<boolean>(false);

  // AI Assistant Chat State
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: 'user' | 'assistant'; text: string }>
  >([]);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);

  useEffect(() => {
    if (site?.id) {
      loadSiteMetricsAndAlerts(site.id);
      setChatMessages([
        {
          sender: 'assistant',
          text: `Hello! I am your AI assistant for Site '${site.name}'. How can I assist you with this site's telemetry, alerts, or carbon estimates?`,
        },
      ]);
    }
  }, [site?.id]);

  const loadSiteMetricsAndAlerts = async (siteId: number) => {
    setLoading(true);
    try {
      const [fetchedMetrics, fetchedAlerts] = await Promise.all([
        api.metrics.get(siteId),
        api.alerts.list(siteId),
      ]);
      setMetrics(fetchedMetrics);
      setSiteAlerts(fetchedAlerts);
    } catch (err) {
      console.error('Failed to load site metrics or alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedMetrics = async (includeSpike: boolean) => {
    if (!site) return;
    setSeeding(true);
    try {
      await api.metrics.seed(site.id, includeSpike);
      await loadSiteMetricsAndAlerts(site.id);
    } catch (err) {
      console.error('Failed to seed site metrics:', err);
    } finally {
      setSeeding(false);
    }
  };

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMsg.trim() || !site || chatLoading) return;

    const userText = inputMsg.trim();
    setInputMsg('');
    setChatMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setChatLoading(true);

    try {
      const res: AssistantChatResponse = await api.sites.chatAssistant(
        site.id,
        userText
      );
      setChatMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: res.response },
      ]);
    } catch (err: unknown) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `Sorry, I couldn't process your request: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (!site) return null;

  const parentProject = projects.find((p) => p.id === site.project_id);

  const getSiteTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'mangrove':
        return 'badge-teal';
      case 'reforestation':
        return 'badge-emerald';
      default:
        return 'badge-neutral';
    }
  };

  const coords = site.geojson?.coordinates?.[0] || [];
  const vertexCount = coords.length;
  const centroidLat = coords.length > 0 ? coords[0][1].toFixed(4) : '11.2700';
  const centroidLng = coords.length > 0 ? coords[0][0].toFixed(4) : '75.8200';
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <div
        className="printable-site-panel font-sans"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '100%',
          maxWidth: '440px',
          height: '100%',
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid var(--color-line)',
          boxShadow: '-4px 0 16px rgba(15, 23, 42, 0.08)',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          transform: site ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Printable Executive Single-Page PDF Report (Only visible during window.print()) */}
        <div className="hidden print:block p-6 bg-white space-y-4">
          {/* Header Bar */}
          <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900">
            <div>
              <div className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <Trees className="w-6 h-6 text-emerald-600" />
                <span>Darukaa.Earth</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Geospatial Monitoring & Carbon Telemetry Platform
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                Executive Site Report
              </span>
              <p className="text-xs text-slate-400 mt-1">
                Generated: {reportDate}
              </p>
            </div>
          </div>

          {/* Site Identity Block */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">Site Name:</span>
              <strong className="text-slate-900 text-sm">{site.name}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Parent Project:</span>
              <strong className="text-slate-900">
                {parentProject?.name || 'N/A'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">
                Ecosystem Classification:
              </span>
              <span className="capitalize font-semibold text-emerald-800">
                {site.site_type}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">
                Total Area & Centroid:
              </span>
              <span className="font-mono">
                {site.area_hectares} ha ({centroidLat}° N, {centroidLng}° E)
              </span>
            </div>
          </div>

          {/* Active Alerts (if any) */}
          {siteAlerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700">Active Degradation Alerts ({siteAlerts.length})</h4>
              {siteAlerts.map((a, i) => (
                <div key={i} className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
                  <strong>{a.metric_type.toUpperCase()} drop detected:</strong> {a.message} ({a.recorded_at})
                </div>
              ))}
            </div>
          )}

          {/* Surface Area & Spatial Metadata Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-slate-200 rounded-lg bg-white">
              <div className="text-xs font-semibold text-slate-500 uppercase">Surface Area</div>
              <div className="text-xl font-bold font-mono text-slate-800 mt-1">{site.area_hectares != null ? `${site.area_hectares} ha` : 'N/A'}</div>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg bg-white">
              <div className="text-xs font-semibold text-slate-500 uppercase">Centroid Lat / Lng</div>
              <div className="text-xs font-bold font-mono text-slate-800 mt-2">{centroidLat}° N, {centroidLng}° E</div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg bg-white text-xs space-y-2">
            <div className="font-bold text-slate-800 border-b border-slate-200 pb-1">Spatial Polygon Metadata</div>
            <div className="flex justify-between text-slate-600"><span>Geometry Type</span><span className="font-mono">GeoJSON Polygon</span></div>
            <div className="flex justify-between text-slate-600"><span>SRID Reference</span><span className="font-mono">EPSG:4326 (WGS84)</span></div>
            <div className="flex justify-between text-slate-600"><span>Boundary Vertex Count</span><span className="font-mono">{vertexCount} vertices</span></div>
            {site.created_at && <div className="flex justify-between text-slate-600"><span>Mapped Timestamp</span><span>{new Date(site.created_at).toLocaleDateString()}</span></div>}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex justify-between text-xs text-slate-400">
            <span>Darukaa.Earth Planetary Intelligence Assessment</span>
            <span>Page 1 of 1</span>
          </div>
        </div>

        {/* Header Bar */}
        <div
          className="print:hidden"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-line)',
            backgroundColor: '#FAFAFA',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <div>
              <span
                className={`badge ${getSiteTypeBadgeClass(site.site_type)}`}
                style={{ marginBottom: '6px' }}
              >
                <Trees size={11} /> {site.site_type}
              </span>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                }}
              >
                {site.name}
              </h2>
              {parentProject && (
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-ink-muted)',
                    marginTop: '2px',
                  }}
                >
                  Parent Project:{' '}
                  <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                    {parentProject.name}
                  </span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setDigestModalOpen(true);
                }}
                className="btn-secondary"
                style={{
                  height: '28px',
                  fontSize: '11px',
                  padding: '0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
                title="Preview Email Alert Digest"
              >
                <Mail size={13} /> Digest
              </button>
              <button
                onClick={handleExportPDF}
                className="btn-secondary"
                style={{
                  height: '28px',
                  fontSize: '11px',
                  padding: '0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Export single-page executive PDF site report"
              >
                <Printer size={13} /> PDF Report
              </button>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--color-ink-muted)',
                  borderRadius: '4px',
                }}
                title="Close inspector panel"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Panel Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--color-line)',
              gap: '12px',
              marginTop: '12px',
            }}
          >
            <button
              onClick={() => setActiveTab('overview')}
              style={{
                padding: '6px 0',
                border: 'none',
                borderBottom:
                  activeTab === 'overview'
                    ? '2px solid var(--color-ink)'
                    : '2px solid transparent',
                backgroundColor: 'transparent',
                fontWeight: activeTab === 'overview' ? 600 : 400,
                color:
                  activeTab === 'overview'
                    ? 'var(--color-ink)'
                    : 'var(--color-ink-muted)',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Info size={13} /> Overview
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              style={{
                padding: '6px 0',
                border: 'none',
                borderBottom:
                  activeTab === 'analytics'
                    ? '2px solid var(--color-ink)'
                    : '2px solid transparent',
                backgroundColor: 'transparent',
                fontWeight: activeTab === 'analytics' ? 600 : 400,
                color:
                  activeTab === 'analytics'
                    ? 'var(--color-ink)'
                    : 'var(--color-ink-muted)',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <LineChart size={13} /> Analytics
            </button>
            <button
              onClick={() => setActiveTab('assistant')}
              style={{
                padding: '6px 0',
                border: 'none',
                borderBottom:
                  activeTab === 'assistant'
                    ? '2px solid var(--color-ink)'
                    : '2px solid transparent',
                backgroundColor: 'transparent',
                fontWeight: activeTab === 'assistant' ? 600 : 400,
                color:
                  activeTab === 'assistant'
                    ? 'var(--color-ink)'
                    : 'var(--color-ink-muted)',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Sparkles size={13} className="text-emerald-600" /> Ask AI
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                padding: '6px 0',
                border: 'none',
                borderBottom:
                  activeTab === 'history'
                    ? '2px solid var(--color-ink)'
                    : '2px solid transparent',
                backgroundColor: 'transparent',
                fontWeight: activeTab === 'history' ? 600 : 400,
                color:
                  activeTab === 'history'
                    ? 'var(--color-ink)'
                    : 'var(--color-ink-muted)',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <History size={13} /> History
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="print:hidden" style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          {/* Active Alerts Banner */}
          <AlertBanner alerts={siteAlerts} />

          {activeTab === 'overview' && (
            <div>
              {/* Metric Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '20px',
                }}
              >
                <div className="card-container" style={{ padding: '12px' }}>
                  <div
                    style={{
                      fontSize: '10px',
                      color: 'var(--color-ink-muted)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Surface Area
                  </div>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: '20px',
                      fontWeight: 600,
                      color: 'var(--color-ink)',
                      marginTop: '4px',
                    }}
                  >
                    {site.area_hectares != null
                      ? `${site.area_hectares} ha`
                      : 'Calc...'}
                  </div>
                </div>

                <div className="card-container" style={{ padding: '12px' }}>
                  <div
                    style={{
                      fontSize: '10px',
                      color: 'var(--color-ink-muted)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Centroid Lat/Lng
                  </div>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--color-ink)',
                      marginTop: '6px',
                    }}
                  >
                    {centroidLat}° N, {centroidLng}° E
                  </div>
                </div>
              </div>

              {/* Geometry Info */}
              <div
                className="card-container"
                style={{ padding: '14px', marginBottom: '20px' }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-ink)',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Globe size={15} color="var(--color-teal)" /> Spatial Polygon
                  Metadata
                </div>
                <div style={{ fontSize: '12px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: '1px solid var(--color-line)',
                    }}
                  >
                    <span style={{ color: 'var(--color-ink-muted)' }}>
                      Geometry Type
                    </span>
                    <span className="font-mono" style={{ fontWeight: 500 }}>
                      GeoJSON Polygon
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: '1px solid var(--color-line)',
                    }}
                  >
                    <span style={{ color: 'var(--color-ink-muted)' }}>
                      SRID Reference
                    </span>
                    <span className="font-mono" style={{ fontWeight: 500 }}>
                      EPSG:4326 (WGS84)
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                    }}
                  >
                    <span style={{ color: 'var(--color-ink-muted)' }}>
                      Boundary Vertex Count
                    </span>
                    <span className="font-mono" style={{ fontWeight: 500 }}>
                      {vertexCount} vertices
                    </span>
                  </div>
                </div>
              </div>

              {/* Created Timestamp */}
              {site.created_at && (
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-ink-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '20px',
                  }}
                >
                  <Calendar size={13} />
                  Mapped on {new Date(site.created_at).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              {/* Time Series Chart */}
              <div style={{ marginBottom: '20px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '12px',
                      color: 'var(--color-ink)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <LineChart size={14} color="var(--color-teal)" />
                    NDVI & Canopy Cover Time-Series
                  </div>

                  {(userRole === 'admin' || userRole === 'analyst') && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleSeedMetrics(false)}
                        disabled={seeding}
                        className="btn-secondary"
                        style={{
                          fontSize: '10px',
                          height: '22px',
                          padding: '0 6px',
                        }}
                        title="Seed 12-month normal seasonal data"
                      >
                        <RefreshCw size={10} />
                        {seeding ? '...' : 'Seed Data'}
                      </button>
                      <button
                        onClick={() => handleSeedMetrics(true)}
                        disabled={seeding}
                        className="btn-danger"
                        style={{
                          fontSize: '10px',
                          height: '22px',
                          padding: '0 6px',
                        }}
                        title="Inject >10% degradation drop"
                      >
                        Simulate Drop
                      </button>
                    </div>
                  )}
                </div>

                {loading ? (
                  <div
                    style={{
                      padding: '24px',
                      textAlign: 'center',
                      fontSize: '12px',
                      color: 'var(--color-ink-muted)',
                    }}
                  >
                    Loading telemetry metrics...
                  </div>
                ) : (
                  <SiteMetricsChart metrics={metrics} />
                )}
              </div>
            </div>
          )}

          {/* AI Assistant Tab */}
          {activeTab === 'assistant' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '420px',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                backgroundColor: '#F8FAFC',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#FFFFFF',
                  borderBottom: '1px solid #E2E8F0',
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
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0F172A',
                  }}
                >
                  <Bot size={15} color="#059669" />
                  <span>Ask about this site</span>
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#047857',
                    backgroundColor: '#ECFDF5',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #A7F3D0',
                  }}
                >
                  Groq LLM Scoped
                </span>
              </div>

              {/* Chat Thread */}
              <div
                style={{
                  flex: 1,
                  padding: '12px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '12px',
                }}
              >
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent:
                        msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '85%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        lineHeight: '1.5',
                        backgroundColor:
                          msg.sender === 'user' ? '#059669' : '#FFFFFF',
                        color: msg.sender === 'user' ? '#FFFFFF' : '#0F172A',
                        border:
                          msg.sender === 'user'
                            ? 'none'
                            : '1px solid #E2E8F0',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          backgroundColor: '#10B981',
                          borderRadius: '50%',
                        }}
                      />
                      Analyzing site telemetry context...
                    </div>
                  </div>
                )}
              </div>

              {/* Disclaimer Microcopy */}
              <div
                style={{
                  padding: '4px 10px',
                  backgroundColor: '#FFFBEB',
                  borderTop: '1px solid #FEF3C7',
                  fontSize: '10px',
                  color: '#92400E',
                  fontWeight: 500,
                  textAlign: 'center',
                }}
              >
                AI-generated, verify independently.
              </div>

              {/* Chat Input Form */}
              <form
                onSubmit={handleSendChatMessage}
                style={{
                  padding: '8px 10px',
                  backgroundColor: '#FFFFFF',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  placeholder={`Ask questions about ${site.name}...`}
                  disabled={chatLoading}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: '12px',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={!inputMsg.trim() || chatLoading}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#059669',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    opacity: !inputMsg.trim() || chatLoading ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Send size={13} />
                </button>
              </form>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <div
                className="card-container"
                style={{ padding: '14px', fontSize: '12px' }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: 'var(--color-ink)',
                    marginBottom: '8px',
                  }}
                >
                  Audit History Trail
                </div>
                <p
                  style={{
                    color: 'var(--color-ink-muted)',
                    fontSize: '11px',
                    lineHeight: '1.4',
                  }}
                >
                  All polygon boundary edits, metric ingestions, and telemetry
                  updates are logged automatically via SQLAlchemy event
                  listeners.
                </p>
              </div>
            </div>
          )}

          {/* Delete Action (Admin only) */}
          {userRole === 'admin' && (
            <div
              style={{
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid var(--color-line)',
              }}
            >
              <button
                onClick={() => onDeleteSite(site.id)}
                className="btn-danger print:hidden"
                style={{ width: '100%', height: '32px' }}
              >
                <Trash2 size={13} />
                Delete Conservation Site
              </button>
            </div>
          )}
        </div>

        {/* Print-safe Page Footer (Only visible during print) */}
        <div className="hidden print:flex justify-between items-center p-4 border-t border-slate-300 text-xs text-slate-500">
          <span>Darukaa.Earth Executive Environmental Assessment</span>
          <span>Page 1 of 1</span>
        </div>
      </div>

      {/* Alert Digest Email Preview Modal */}
      <AlertDigestModal
        site={site}
        alerts={siteAlerts}
        isOpen={digestModalOpen}
        onClose={() => setDigestModalOpen(false)}
      />
    </>
  );
};
