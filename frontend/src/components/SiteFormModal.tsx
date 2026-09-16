import React, { useState } from 'react';
import { GeoJSONPolygon, Project, SiteType } from '../types';
import { MapPin, AlertTriangle } from 'lucide-react';

interface SiteFormModalProps {
  projects: Project[];
  drawnGeoJSON: GeoJSONPolygon | null;
  onSaveSite: (
    projectId: number,
    name: string,
    siteType: SiteType,
    geojson: GeoJSONPolygon
  ) => Promise<void>;
  onClose: () => void;
}

export const SiteFormModal: React.FC<SiteFormModalProps> = ({
  projects,
  drawnGeoJSON,
  onSaveSite,
  onClose,
}) => {
  const [projectId, setProjectId] = useState<number>(projects[0]?.id || 0);
  const [name, setName] = useState('');
  const [siteType, setSiteType] = useState<SiteType>('mixed');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const vertexCount =
    drawnGeoJSON && drawnGeoJSON.coordinates && drawnGeoJSON.coordinates[0]
      ? drawnGeoJSON.coordinates[0].length
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Site name is required.');
      return;
    }
    if (!projectId) {
      setErrorMsg('Please select a parent project.');
      return;
    }
    if (!drawnGeoJSON) {
      setErrorMsg('No polygon boundary has been drawn on the map.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await onSaveSite(projectId, name.trim(), siteType, drawnGeoJSON);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to save site polygon.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(28, 43, 34, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--color-line)',
          width: '460px',
          padding: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          <MapPin size={20} color="var(--color-canopy)" />
          <h2
            className="heading-serif"
            style={{ fontSize: '18px', color: 'var(--color-ink)' }}
          >
            Save drawn site polygon
          </h2>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(181, 86, 60, 0.1)',
              border: '1px solid var(--color-clay)',
              color: 'var(--color-clay)',
              fontSize: '12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <AlertTriangle
              size={16}
              style={{ flexShrink: 0, marginTop: '2px' }}
            />
            <div>{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                marginBottom: '4px',
              }}
            >
              Parent project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(Number(e.target.value))}
              className="input-field"
              required
            >
              {projects.length === 0 ? (
                <option value={0}>
                  No projects available - create a project first
                </option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                marginBottom: '4px',
              }}
            >
              Site name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Wayanad North Rainforest Canopy"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                marginBottom: '4px',
              }}
            >
              Site type / classification
            </label>
            <select
              value={siteType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSiteType(e.target.value as SiteType)
              }
              className="input-field"
            >
              <option value="carbon">Carbon sequestration site</option>
              <option value="biodiversity">
                Biodiversity conservation zone
              </option>
              <option value="mixed">Mixed carbon & biodiversity site</option>
            </select>
          </div>

          {/* GeoJSON Boundary Info Box */}
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-line)',
              fontSize: '12px',
              marginBottom: '20px',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>
              Boundary geometry status
            </div>
            <div style={{ color: 'var(--color-ink)', opacity: 0.8 }}>
              {drawnGeoJSON ? (
                <span>
                  GeoJSON Polygon captured with {vertexCount} coordinate
                  vertices
                </span>
              ) : (
                <span style={{ color: 'var(--color-clay)' }}>
                  No polygon drawn on map yet
                </span>
              )}
            </div>
          </div>

          <div
            style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}
          >
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !drawnGeoJSON || projects.length === 0}
              className="btn-primary"
            >
              {isSubmitting ? 'Validating & saving...' : 'Save site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
