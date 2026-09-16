import React, { useEffect, useState } from 'react';
import {
  Site,
  Project,
  UserRole,
  SiteMetric,
  DegradationAlert,
} from '../types';
import { api } from '../api';
import { SiteMetricsChart } from './SiteMetricsChart';
import { AlertBanner } from './AlertBanner';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'history'>('overview');
  const [metrics, setMetrics] = useState<SiteMetric[]>([]);
  const [siteAlerts, setSiteAlerts] = useState<DegradationAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [seeding, setSeeding] = useState<boolean>(false);

  useEffect(() => {
    if (site?.id) {
      loadSiteMetricsAndAlerts(site.id);
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
  const centroidLat = coords.length > 0 ? (coords[0][1]).toFixed(4) : '11.2700';
  const centroidLng = coords.length > 0 ? (coords[0][0]).toFixed(4) : '75.8200';

  return (
    <div
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
      {/* Header Bar */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-line)',
          backgroundColor: '#FAFAFA',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <span className={`badge ${getSiteTypeBadgeClass(site.site_type)}`} style={{ marginBottom: '6px' }}>
              <Trees size={11} /> {site.site_type}
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)' }}>{site.name}</h2>
            {parentProject && (
              <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
                Project Container: <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{parentProject.name}</span>
              </div>
            )}
          </div>
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

        {/* Panel Inspector Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-line)', gap: '16px', marginTop: '12px' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '6px 0',
              border: 'none',
              borderBottom: activeTab === 'overview' ? '2px solid var(--color-ink)' : '2px solid transparent',
              backgroundColor: 'transparent',
              fontWeight: activeTab === 'overview' ? 600 : 400,
              color: activeTab === 'overview' ? 'var(--color-ink)' : 'var(--color-ink-muted)',
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
              borderBottom: activeTab === 'analytics' ? '2px solid var(--color-ink)' : '2px solid transparent',
              backgroundColor: 'transparent',
              fontWeight: activeTab === 'analytics' ? 600 : 400,
              color: activeTab === 'analytics' ? 'var(--color-ink)' : 'var(--color-ink-muted)',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <LineChart size={13} /> Analytics & Chart
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '6px 0',
              border: 'none',
              borderBottom: activeTab === 'history' ? '2px solid var(--color-ink)' : '2px solid transparent',
              backgroundColor: 'transparent',
              fontWeight: activeTab === 'history' ? 600 : 400,
              color: activeTab === 'history' ? 'var(--color-ink)' : 'var(--color-ink-muted)',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <History size={13} /> Audit Trail
          </button>
        </div>
      </div>

      {/* Content Body */}
      <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
        {/* Degradation Alerts (Feature B) */}
        <AlertBanner alerts={siteAlerts} />

        {activeTab === 'overview' && (
          <div>
            {/* Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div className="card-container" style={{ padding: '12px' }}>
                <div style={{ fontSize: '10px', color: 'var(--color-ink-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Surface Area
                </div>
                <div className="font-mono" style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-ink)', marginTop: '4px' }}>
                  {site.area_hectares != null ? `${site.area_hectares} ha` : 'Calc...'}
                </div>
              </div>

              <div className="card-container" style={{ padding: '12px' }}>
                <div style={{ fontSize: '10px', color: 'var(--color-ink-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Centroid Lat/Lng
                </div>
                <div className="font-mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink)', marginTop: '6px' }}>
                  {centroidLat}° N, {centroidLng}° E
                </div>
              </div>
            </div>

            {/* Geometry Info */}
            <div className="card-container" style={{ padding: '14px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Globe size={15} color="var(--color-teal)" /> Spatial Polygon Metadata
              </div>
              <div style={{ fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-line)' }}>
                  <span style={{ color: 'var(--color-ink-muted)' }}>Geometry Type</span>
                  <span className="font-mono" style={{ fontWeight: 500 }}>GeoJSON Polygon</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-line)' }}>
                  <span style={{ color: 'var(--color-ink-muted)' }}>SRID Reference</span>
                  <span className="font-mono" style={{ fontWeight: 500 }}>EPSG:4326 (WGS84)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ color: 'var(--color-ink-muted)' }}>Boundary Vertex Count</span>
                  <span className="font-mono" style={{ fontWeight: 500 }}>{vertexCount} vertices</span>
                </div>
              </div>
            </div>

            {/* Created Timestamp */}
            {site.created_at && (
              <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <LineChart size={14} color="var(--color-teal)" />
                  NDVI & Canopy Cover Time-Series
                </div>

                {(userRole === 'admin' || userRole === 'analyst') && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleSeedMetrics(false)}
                      disabled={seeding}
                      className="btn-secondary"
                      style={{ fontSize: '10px', height: '22px', padding: '0 6px' }}
                      title="Seed 12-month normal seasonal data"
                    >
                      <RefreshCw size={10} />
                      {seeding ? '...' : 'Seed Data'}
                    </button>
                    <button
                      onClick={() => handleSeedMetrics(true)}
                      disabled={seeding}
                      className="btn-danger"
                      style={{ fontSize: '10px', height: '22px', padding: '0 6px' }}
                      title="Inject >10% degradation drop"
                    >
                      Simulate Drop
                    </button>
                  </div>
                )}
              </div>

              {loading ? (
                <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--color-ink-muted)' }}>
                  Loading telemetry metrics...
                </div>
              ) : (
                <SiteMetricsChart metrics={metrics} />
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div className="card-container" style={{ padding: '14px', fontSize: '12px' }}>
              <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: '8px' }}>
                Audit History Trail
              </div>
              <p style={{ color: 'var(--color-ink-muted)', fontSize: '11px', lineHeight: '1.4' }}>
                All polygon boundary edits, metric ingestions, and telemetry updates are logged automatically via SQLAlchemy event listeners.
              </p>
            </div>
          </div>
        )}

        {/* Delete Action (Admin only) */}
        {userRole === 'admin' && (
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-line)' }}>
            <button
              onClick={() => onDeleteSite(site.id)}
              className="btn-danger"
              style={{ width: '100%', height: '32px' }}
            >
              <Trash2 size={13} />
              Delete Conservation Site
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

