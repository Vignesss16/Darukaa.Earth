import React, { useState } from 'react';
import { GeoJSONPolygon, Project, SiteType } from '../types';
import { api } from '../api';
import {
  MapPin,
  AlertTriangle,
  Upload,
  CheckCircle2,
  Layers,
} from 'lucide-react';

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
  onSuccessBulk?: () => void;
}

interface GeoJSONFeatureCollection {
  type: string;
  features: Array<unknown>;
}

export const SiteFormModal: React.FC<SiteFormModalProps> = ({
  projects,
  drawnGeoJSON: initialDrawnGeoJSON,
  onSaveSite,
  onClose,
  onSuccessBulk,
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
  const [bulkFeatureCollection, setBulkFeatureCollection] =
    useState<GeoJSONFeatureCollection | null>(null);
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

        if (
          parsed.type === 'FeatureCollection' &&
          parsed.features?.length > 1
        ) {
          // Multi-feature GeoJSON bulk import
          setBulkFeatureCollection(parsed);
          setDrawnGeoJSON(null);
          setImportedFileName(
            `${file.name} (${parsed.features.length} Features)`
          );
          setErrorMsg('');
          return;
        }

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
            'Uploaded file does not contain a valid GeoJSON Polygon or FeatureCollection.'
          );
        }

        let finalPolygon: GeoJSONPolygon;
        if (
          rawGeom.type === 'MultiPolygon' &&
          rawGeom.coordinates?.length > 0
        ) {
          finalPolygon = {
            type: 'Polygon',
            coordinates: rawGeom.coordinates[0] as number[][][],
          };
        } else {
          finalPolygon = {
            type: 'Polygon',
            coordinates: rawGeom.coordinates as number[][][],
          };
        }

        setBulkFeatureCollection(null);
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

    if (isNewProject && !newProjectName.trim()) {
      setErrorMsg('New project name is required.');
      return;
    }
    if (!isNewProject && !projectId) {
      setErrorMsg('Please select a parent project.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      // If project needs to be created first for bulk import or single site
      let targetProjectId = projectId;
      if (isNewProject) {
        const createdProj = await api.projects.create({
          name: newProjectName.trim(),
          description: 'Created during site boundary import',
          status: 'active',
        });
        targetProjectId = createdProj.id;
      }

      if (bulkFeatureCollection) {
        // Bulk FeatureCollection creation
        await api.sites.bulkImport(targetProjectId, bulkFeatureCollection);
        if (onSuccessBulk) onSuccessBulk();
        onClose();
        return;
      }

      if (!drawnGeoJSON) {
        setErrorMsg('No polygon boundary has been drawn or imported.');
        setIsSubmitting(false);
        return;
      }

      const finalSiteName =
        name.trim() ||
        `Mapped Conservation Site #${Math.floor(1000 + Math.random() * 9000)}`;

      await onSaveSite(
        targetProjectId,
        null,
        finalSiteName,
        siteType,
        drawnGeoJSON
      );
      onClose();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to save site polygon(s).'
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
          width: '480px',
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
            {bulkFeatureCollection
              ? 'Bulk Import Sites'
              : 'Save Site Boundary Polygon'}
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
              <label style={{ fontSize: '12px', fontWeight: 500 }}>
                Parent Project
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
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {isNewProject ? 'Select Existing' : '+ New Project Container'}
                </button>
              )}
            </div>

            {isNewProject ? (
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project Name..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-line)',
                  fontSize: '13px',
                }}
              />
            ) : (
              <select
                value={projectId}
                onChange={(e) => setProjectId(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-line)',
                  fontSize: '13px',
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {!bulkFeatureCollection && (
            <>
              <div style={{ marginBottom: '14px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Site Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Northern Canopy Sector 4"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-line)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Ecosystem Classification
                </label>
                <select
                  value={siteType}
                  onChange={(e) => setSiteType(e.target.value as SiteType)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-line)',
                    fontSize: '13px',
                  }}
                >
                  <option value="carbon">Carbon Reserve</option>
                  <option value="biodiversity">Biodiversity Habitat</option>
                  <option value="mixed">Mixed Ecosystem</option>
                  <option value="mangrove">Mangrove Restoration</option>
                  <option value="reforestation">Reforestation Zone</option>
                </select>
              </div>
            </>
          )}

          {/* GeoJSON Import Options */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                fontSize: '12px',
                fontWeight: 500,
                display: 'block',
                marginBottom: '6px',
              }}
            >
              Upload GeoJSON (Single Polygon or FeatureCollection)
            </label>
            <div
              style={{
                border: '1px dashed var(--color-line)',
                padding: '12px',
                borderRadius: '6px',
                textAlign: 'center',
                backgroundColor: 'var(--color-sand-light)',
              }}
            >
              <input
                type="file"
                accept=".geojson,.json"
                onChange={handleFileUpload}
                id="geojson-file-upload"
                style={{ display: 'none' }}
              />
              <label
                htmlFor="geojson-file-upload"
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: 'var(--color-ink-muted)',
                }}
              >
                <Upload size={18} color="var(--color-canopy)" />
                {importedFileName ? (
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={14} /> {importedFileName}
                  </span>
                ) : (
                  <span>Click to upload .geojson file</span>
                )}
              </label>
            </div>
          </div>

          {bulkFeatureCollection && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg mb-4 text-xs text-emerald-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <strong>FeatureCollection Detected!</strong>
                <p>
                  Ready to batch import {bulkFeatureCollection.features.length}{' '}
                  site polygons into the selected project container.
                </p>
              </div>
            </div>
          )}

          {drawnGeoJSON && !bulkFeatureCollection && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--color-ink-muted)',
                marginBottom: '16px',
                backgroundColor: 'var(--color-sand-light)',
                padding: '8px 10px',
                borderRadius: '6px',
              }}
            >
              Boundary Vertex Count: <strong>{vertexCount} vertices</strong>
            </div>
          )}

          <div
            style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ height: '34px', fontSize: '12px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ height: '34px', fontSize: '12px' }}
            >
              {isSubmitting
                ? 'Saving...'
                : bulkFeatureCollection
                  ? `Import ${bulkFeatureCollection.features.length} Sites`
                  : 'Save Site Boundary'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
