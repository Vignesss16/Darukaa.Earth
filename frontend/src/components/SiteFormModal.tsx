import React, { useState } from 'react';
import { GeoJSONPolygon, Project, SiteType } from '../types';
import { MapPin, AlertTriangle, Upload, CheckCircle2 } from 'lucide-react';

interface SiteFormModalProps {
  projects: Project[];
  drawnGeoJSON: GeoJSONPolygon | null;
  onSaveSite: (
    projectId: number | null,
    newProjectName: string | null,
    name: string,
    siteType: SiteType,
    geojson: GeoJSONPolygon
  ) => Promise<void>;
  onClose: () => void;
}

export const SiteFormModal: React.FC<SiteFormModalProps> = ({
  projects,
  drawnGeoJSON: initialDrawnGeoJSON,
  onSaveSite,
  onClose,
}) => {
  const [isNewProject, setIsNewProject] = useState<boolean>(
    projects.length === 0
  );
  const [projectId, setProjectId] = useState<number>(projects[0]?.id || 0);
  const [newProjectName, setNewProjectName] = useState<string>(
    'Default Conservation Project'
  );
  const [name, setName] = useState('');
  const [siteType, setSiteType] = useState<SiteType>('mixed');
  const [drawnGeoJSON, setDrawnGeoJSON] = useState<GeoJSONPolygon | null>(
    initialDrawnGeoJSON
  );
  const [importedFileName, setImportedFileName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const vertexCount =
    drawnGeoJSON && drawnGeoJSON.coordinates && drawnGeoJSON.coordinates[0]
      ? drawnGeoJSON.coordinates[0].length
      : 0;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        let rawGeom: {
          type: string;
          coordinates: number[][][] | number[][][][];
        } | null = null;
        let suggestedName = '';

        if (
          parsed.type === 'FeatureCollection' &&
          parsed.features?.length > 0
        ) {
          const feat = parsed.features[0];
          rawGeom = feat.geometry;
          suggestedName = feat.properties?.name || feat.properties?.title || '';
        } else if (parsed.type === 'Feature') {
          rawGeom = parsed.geometry;
          suggestedName =
            parsed.properties?.name || parsed.properties?.title || '';
        } else if (
          parsed.type === 'Polygon' ||
          parsed.type === 'MultiPolygon'
        ) {
          rawGeom = parsed;
        }

        if (
          !rawGeom ||
          (rawGeom.type !== 'Polygon' && rawGeom.type !== 'MultiPolygon')
        ) {
          throw new Error(
            'Uploaded file does not contain a valid GeoJSON Polygon.'
          );
        }

        let finalPolygon: GeoJSONPolygon;
        if (
          rawGeom.type === 'MultiPolygon' &&
          rawGeom.coordinates?.length > 0
        ) {
          finalPolygon = {
            type: 'Polygon',
            coordinates: rawGeom.coordinates[0],
          };
        } else {
          finalPolygon = {
            type: 'Polygon',
            coordinates: rawGeom.coordinates,
          };
        }

        setDrawnGeoJSON(finalPolygon);
        setImportedFileName(file.name);
        if (suggestedName && !name) {
          setName(suggestedName);
        }
        setErrorMsg('');
      } catch (err: unknown) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Invalid GeoJSON file format. Please upload a valid .geojson or .json file.'
        );
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Site name is required.');
      return;
    }
    if (isNewProject && !newProjectName.trim()) {
      setErrorMsg('New project name is required.');
      return;
    }
    if (!isNewProject && !projectId) {
      setErrorMsg('Please select a parent project.');
      return;
    }
    if (!drawnGeoJSON) {
      setErrorMsg('No polygon boundary has been drawn or imported.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await onSaveSite(
        isNewProject ? null : projectId,
        isNewProject ? newProjectName.trim() : null,
        name.trim(),
        siteType,
        drawnGeoJSON
      );
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
        className="card-container"
        style={{
          backgroundColor: '#FFFFFF',
          width: '460px',
          padding: '24px',
          borderRadius: '12px',
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
            Save site boundary polygon
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
              borderRadius: '6px',
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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px',
              }}
            >
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Parent project
              </label>
              {projects.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsNewProject(!isNewProject)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-secondary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  {isNewProject
                    ? 'Select existing project'
                    : '+ Create new project'}
                </button>
              )}
            </div>

            {isNewProject ? (
              <input
                type="text"
                required
                placeholder="e.g. Amazon Carbon Reserve"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="input-field"
              />
            ) : (
              <select
                value={projectId}
                onChange={(e) => setProjectId(Number(e.target.value))}
                className="input-field"
                required
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
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

          {/* GeoJSON Boundary Info & Import Box */}
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-line)',
              borderRadius: '6px',
              fontSize: '12px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <div style={{ fontWeight: 600 }}>Boundary geometry status</div>
              <label
                style={{
                  cursor: 'pointer',
                  color: 'var(--color-teal)',
                  fontWeight: 600,
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Upload size={12} />
                <span>Import .geojson</span>
                <input
                  type="file"
                  accept=".json,.geojson"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <div style={{ color: 'var(--color-ink)', opacity: 0.85 }}>
              {drawnGeoJSON ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--color-emerald)',
                  }}
                >
                  <CheckCircle2 size={14} />
                  <span>
                    GeoJSON Polygon active ({vertexCount} vertices)
                    {importedFileName
                      ? ` — imported from ${importedFileName}`
                      : ''}
                  </span>
                </div>
              ) : (
                <span style={{ color: 'var(--color-clay)' }}>
                  No boundary captured yet. Draw on map or click 'Import
                  .geojson'.
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
              disabled={isSubmitting || !drawnGeoJSON}
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
