import React from 'react';
import { Site, Project, UserRole } from '../types';
import { X, Calendar, Trash2, Globe, Trees } from 'lucide-react';

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
  if (!site) return null;

  const parentProject = projects.find((p) => p.id === site.project_id);

  const getSiteTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'carbon':
        return 'badge-moss';
      case 'biodiversity':
        return 'badge-moss';
      default:
        return 'badge-neutral';
    }
  };

  const vertexCount =
    site.geojson && site.geojson.coordinates && site.geojson.coordinates[0]
      ? site.geojson.coordinates[0].length
      : 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '380px',
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderLeft: '1px solid var(--color-line)',
        boxShadow: '-4px 0 16px rgba(28, 43, 34, 0.08)',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        transform: site ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid var(--color-line)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundColor: 'var(--color-bg)',
        }}
      >
        <div>
          <div className="badge badge-neutral" style={{ marginBottom: '6px' }}>
            Site details
          </div>
          <h2
            className="heading-serif"
            style={{ fontSize: '20px', color: 'var(--color-ink)' }}
          >
            {site.name}
          </h2>
          {parentProject && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--color-ink)',
                opacity: 0.75,
                marginTop: '2px',
              }}
            >
              Project: {parentProject.name}
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
            color: 'var(--color-ink)',
          }}
          title="Close panel"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
        {/* Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-line)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: 'var(--color-ink)',
                opacity: 0.7,
                marginBottom: '4px',
              }}
            >
              Area size
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--color-canopy)',
              }}
            >
              {site.area_hectares != null
                ? `${site.area_hectares} ha`
                : 'Calculating...'}
            </div>
          </div>

          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-line)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: 'var(--color-ink)',
                opacity: 0.7,
                marginBottom: '4px',
              }}
            >
              Site classification
            </div>
            <span className={`badge ${getSiteTypeBadgeClass(site.site_type)}`}>
              <Trees size={12} style={{ marginRight: '4px' }} />
              {site.site_type}
            </span>
          </div>
        </div>

        {/* Spatial Boundary Properties */}
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: '13px',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Globe size={15} color="var(--color-canopy)" />
            Spatial geometry info
          </div>
          <div
            style={{
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-line)',
              padding: '12px',
              fontSize: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '6px',
                borderBottom: '1px solid var(--color-line)',
              }}
            >
              <span style={{ opacity: 0.7 }}>Geometry type</span>
              <span style={{ fontWeight: 500 }}>GeoJSON Polygon</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: '1px solid var(--color-line)',
              }}
            >
              <span style={{ opacity: 0.7 }}>Spatial SRID</span>
              <span style={{ fontWeight: 500 }}>EPSG:4326 (WGS84)</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '6px',
              }}
            >
              <span style={{ opacity: 0.7 }}>Polygon boundary points</span>
              <span style={{ fontWeight: 500 }}>{vertexCount} vertices</span>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        {site.created_at && (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--color-ink)',
              opacity: 0.7,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '24px',
            }}
          >
            <Calendar size={14} />
            Created on {new Date(site.created_at).toLocaleDateString()}
          </div>
        )}

        {/* Admin Actions */}
        {userRole === 'admin' && (
          <div
            style={{
              marginTop: '32px',
              paddingTop: '16px',
              borderTop: '1px solid var(--color-line)',
            }}
          >
            <button
              onClick={() => onDeleteSite(site.id)}
              className="btn-danger"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Trash2 size={14} />
              Delete conservation site
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
