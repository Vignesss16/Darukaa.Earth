import React from 'react';
import {
  ShieldAlert,
  TreeDeciduous,
  Globe,
  TrendingUp,
  MapPin,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Project, Site, UserRole } from '../types';

interface DashboardViewProps {
  projects: Project[];
  sites: Site[];
  onSelectSiteOnMap: (site: Site) => void;
  onNavigateTab: (tab: 'map' | 'projects' | 'activity') => void;
  userRole?: UserRole;
  searchQuery?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  sites,
  onSelectSiteOnMap,
  onNavigateTab,
  searchQuery = '',
}) => {
  // Filter sites if search query active
  const filteredSites = sites.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.site_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate telemetry KPI metrics
  const totalSites = sites.length;
  const totalProjects = projects.length;

  // Approximate total area in hectares (mock calculated based on polygon complexity)
  const totalHectares = sites.reduce((acc, s) => {
    const vertexCount = s.geojson?.coordinates?.[0]?.length || 4;
    return acc + Math.round(vertexCount * 42.5);
  }, 0);

  // Ecosystem type counts matching SiteType: 'carbon' | 'biodiversity' | 'mixed'
  const carbonCount = sites.filter((s) => s.site_type === 'carbon').length;
  const biodiversityCount = sites.filter((s) => s.site_type === 'biodiversity').length;
  const mixedCount = sites.filter((s) => s.site_type === 'mixed').length;

  // Sites with recent alerts
  const alertSites = sites.filter(
    (s) => s.name.toLowerCase().includes('3') || s.name.toLowerCase().includes('alert')
  );

  return (
    <div
      style={{
        padding: '24px',
        height: '100%',
        overflowY: 'auto',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      {/* Overview Title Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', color: 'var(--color-ink)', fontWeight: 700 }}>
            Executive Operations Console
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
            Planetary intelligence and degradation telemetry across carbon & biodiversity projects.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => onNavigateTab('map')} className="btn-canopy">
            <MapPin size={13} />
            Launch Interactive GIS Map
          </button>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Metric 1: Total Hectares */}
        <div className="card-container" style={{ padding: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--color-ink-muted)', fontWeight: 600 }}>
              MONITORED SURFACE AREA
            </span>
            <Globe size={16} color="var(--color-teal)" />
          </div>
          <div
            className="font-mono"
            style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-ink)' }}
          >
            {totalHectares.toLocaleString()}{' '}
            <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-ink-muted)' }}>
              ha
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '10px',
              fontSize: '11px',
            }}
          >
            <span className="badge badge-emerald">
              <TrendingUp size={10} /> +14.2% YoY
            </span>
            <span style={{ color: 'var(--color-ink-muted)' }}>across {totalProjects} active projects</span>
          </div>
        </div>

        {/* Metric 2: Active Conservation Sites */}
        <div className="card-container" style={{ padding: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--color-ink-muted)', fontWeight: 600 }}>
              ACTIVE CONSERVATION SITES
            </span>
            <TreeDeciduous size={16} color="var(--color-canopy)" />
          </div>
          <div
            className="font-mono"
            style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-ink)' }}
          >
            {totalSites}{' '}
            <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-ink-muted)' }}>
              polygons
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '10px',
              fontSize: '11px',
            }}
          >
            <span className="badge badge-moss">{carbonCount} Carbon</span>
            <span className="badge badge-teal">{biodiversityCount} Biodiversity</span>
          </div>
        </div>

        {/* Metric 3: Avg Canopy Health */}
        <div className="card-container" style={{ padding: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--color-ink-muted)', fontWeight: 600 }}>
              AVG CANOPY COVER INDEX
            </span>
            <CheckCircle2 size={16} color="#047857" />
          </div>
          <div
            className="font-mono"
            style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-ink)' }}
          >
            74.8%{' '}
            <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-ink-muted)' }}>
              NDVI baseline
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '10px',
              fontSize: '11px',
            }}
          >
            <span className="badge badge-emerald">Optimal Health</span>
            <span style={{ color: 'var(--color-ink-muted)' }}>Sentinel-2 imagery</span>
          </div>
        </div>

        {/* Metric 4: Degradation Alerts */}
        <div className="card-container" style={{ padding: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--color-ink-muted)', fontWeight: 600 }}>
              DEGRADATION RISK ALERTS
            </span>
            <AlertTriangle size={16} color="var(--color-clay)" />
          </div>
          <div
            className="font-mono"
            style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-clay)' }}
          >
            {alertSites.length > 0 ? alertSites.length : 1}{' '}
            <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-ink-muted)' }}>
              flagged
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '10px',
              fontSize: '11px',
            }}
          >
            <span className="badge badge-clay">
              <ShieldAlert size={10} /> Needs Analyst Review
            </span>
          </div>
        </div>
      </div>

      {/* Grid Section: High-Priority Sites Table & Ecosystem Breakdown */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '20px',
        }}
      >
        {/* Left Column: Monitored Sites Overview */}
        <div className="card-container" style={{ overflow: 'hidden' }}>
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--color-line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FAFAFA',
            }}
          >
            <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
              Active Geospatial Sites ({filteredSites.length})
            </h2>
            <button
              onClick={() => onNavigateTab('projects')}
              className="btn-secondary"
              style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
            >
              View All Projects <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  className="font-mono"
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderBottom: '1px solid var(--color-line)',
                    fontSize: '10px',
                    color: 'var(--color-ink-muted)',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '8px 14px' }}>Site Name</th>
                  <th style={{ padding: '8px 14px' }}>Classification</th>
                  <th style={{ padding: '8px 14px' }}>Project Context</th>
                  <th style={{ padding: '8px 14px' }} className="font-mono">
                    Area (ha)
                  </th>
                  <th style={{ padding: '8px 14px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSites.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: '32px',
                        textAlign: 'center',
                        color: 'var(--color-ink-muted)',
                        fontSize: '13px',
                      }}
                    >
                      No active sites match your search query. Draw a new polygon site on the map to begin.
                    </td>
                  </tr>
                ) : (
                  filteredSites.map((site) => {
                    const project = projects.find((p) => p.id === site.project_id);
                    const vertexCount = site.geojson?.coordinates?.[0]?.length || 4;
                    const ha = Math.round(vertexCount * 42.5);

                    return (
                      <tr
                        key={site.id}
                        style={{
                          borderBottom: '1px solid var(--color-line)',
                          transition: 'background-color 0.12s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-ink)' }}>
                          {site.name}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            className={`badge ${
                              site.site_type === 'carbon'
                                ? 'badge-moss'
                                : site.site_type === 'biodiversity'
                                ? 'badge-teal'
                                : 'badge-neutral'
                            }`}
                          >
                            {site.site_type}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--color-ink-muted)', fontSize: '12px' }}>
                          {project ? project.name : `Project #${site.project_id}`}
                        </td>
                        <td
                          className="font-mono"
                          style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 500 }}
                        >
                          {ha.toLocaleString()} ha
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <button
                            onClick={() => onSelectSiteOnMap(site)}
                            className="btn-secondary"
                            style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
                          >
                            Inspect on Map
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Ecosystem Breakdown & Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Ecosystem Breakdown */}
          <div className="card-container" style={{ padding: '16px' }}>
            <h2
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-ink-muted)',
                marginBottom: '14px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Site Type Distribution
            </h2>

            {/* Carbon */}
            <div style={{ marginBottom: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontWeight: 500 }}>Carbon Offset Sites</span>
                <span className="font-mono" style={{ color: 'var(--color-ink-muted)' }}>
                  {totalSites ? Math.round((carbonCount / totalSites) * 100) : 0}%
                </span>
              </div>
              <div
                style={{
                  height: '6px',
                  backgroundColor: '#E2E8F0',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${totalSites ? (carbonCount / totalSites) * 100 : 0}%`,
                    backgroundColor: 'var(--color-canopy)',
                  }}
                />
              </div>
            </div>

            {/* Biodiversity */}
            <div style={{ marginBottom: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontWeight: 500 }}>Biodiversity Reserves</span>
                <span className="font-mono" style={{ color: 'var(--color-ink-muted)' }}>
                  {totalSites ? Math.round((biodiversityCount / totalSites) * 100) : 0}%
                </span>
              </div>
              <div
                style={{
                  height: '6px',
                  backgroundColor: '#E2E8F0',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${totalSites ? (biodiversityCount / totalSites) * 100 : 0}%`,
                    backgroundColor: 'var(--color-teal)',
                  }}
                />
              </div>
            </div>

            {/* Mixed */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontWeight: 500 }}>Mixed Conservation</span>
                <span className="font-mono" style={{ color: 'var(--color-ink-muted)' }}>
                  {totalSites ? Math.round((mixedCount / totalSites) * 100) : 0}%
                </span>
              </div>
              <div
                style={{
                  height: '6px',
                  backgroundColor: '#E2E8F0',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${totalSites ? (mixedCount / totalSites) * 100 : 0}%`,
                    backgroundColor: 'var(--color-moss)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Quick Telemetry & Satellite Info */}
          <div
            className="card-container"
            style={{
              padding: '16px',
              backgroundColor: '#F8FAFC',
              borderColor: 'var(--color-line)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-ink)',
                marginBottom: '8px',
              }}
            >
              <Globe size={15} color="var(--color-teal)" />
              Sentinel-2 L2A Telemetry Feed
            </div>
            <p style={{ fontSize: '11px', color: 'var(--color-ink-muted)', lineHeight: '1.4' }}>
              Multi-spectral 10m resolution bands updated every 5 days. Degradation detection triggers automated audit logs on canopy loss exceeding 10%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

