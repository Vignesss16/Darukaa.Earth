import React, { useState } from 'react';
import {
  Site,
  SiteType,
  GeoJSONPolygon,
  GeoJSONGeometry,
  User,
} from '../types';
import {
  X,
  Pencil,
  MapPin,
  Upload,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

interface SiteEditModalProps {
  site: Site;
  projectName?: string;
  currentUser?: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    siteId: number,
    data: { name?: string; site_type?: SiteType; geojson?: GeoJSONPolygon }
  ) => Promise<void>;
  onStartEditBoundaryOnMap: (site: Site) => void;
}

export const SiteEditModal: React.FC<SiteEditModalProps> = ({
  site,
  projectName,
  currentUser,
  isOpen,
  onClose,
  onSave,
  onStartEditBoundaryOnMap,
}) => {
  const [name, setName] = useState<string>(site.name);
  const [siteType, setSiteType] = useState<SiteType>(site.site_type);
  const [replacementGeoJSON, setReplacementGeoJSON] =
    useState<GeoJSONPolygon | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const rawCoords =
    (replacementGeoJSON || site.geojson)?.coordinates?.[0] || [];
  const isClosed =
    rawCoords.length > 3 &&
    rawCoords[0][0] === rawCoords[rawCoords.length - 1][0] &&
    rawCoords[0][1] === rawCoords[rawCoords.length - 1][1];
  const vertexCount = isClosed ? rawCoords.length - 1 : rawCoords.length;

  const isOwner =
    site.created_by_id === currentUser?.id ||
    (!site.created_by_id && currentUser?.role === 'analyst');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        let rawGeom: GeoJSONGeometry | null = null;
        if (
          parsed.type === 'FeatureCollection' &&
          Array.isArray(parsed.features) &&
          parsed.features.length > 0
        ) {
          rawGeom = parsed.features[0].geometry as GeoJSONGeometry;
        } else if (parsed.type === 'Feature') {
          rawGeom = parsed.geometry as GeoJSONGeometry;
        } else if (
          parsed.type === 'Polygon' ||
          parsed.type === 'MultiPolygon'
        ) {
          rawGeom = parsed as GeoJSONGeometry;
        }

        if (
          !rawGeom ||
          (rawGeom.type !== 'Polygon' && rawGeom.type !== 'MultiPolygon')
        ) {
          throw new Error('File does not contain a valid GeoJSON Polygon.');
        }

        let finalPolygon: GeoJSONPolygon;
        if (
          rawGeom.type === 'MultiPolygon' &&
          Array.isArray(rawGeom.coordinates) &&
          rawGeom.coordinates.length > 0
        ) {
          finalPolygon = {
            type: 'Polygon',
            coordinates: rawGeom.coordinates[0],
          };
        } else if (rawGeom.type === 'Polygon') {
          finalPolygon = rawGeom;
        } else {
          throw new Error('File does not contain a valid GeoJSON Polygon.');
        }

        setReplacementGeoJSON(finalPolygon);
        setUploadedFileName(file.name);
        setErrorMsg('');
      } catch (err: unknown) {
        setErrorMsg(
          err instanceof Error ? err.message : 'Invalid GeoJSON file.'
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

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const updateData: {
        name?: string;
        site_type?: SiteType;
        geojson?: GeoJSONPolygon;
      } = {};
      if (name.trim() !== site.name) {
        updateData.name = name.trim();
      }
      if (siteType !== site.site_type) {
        updateData.site_type = siteType;
      }
      if (replacementGeoJSON) {
        updateData.geojson = replacementGeoJSON;
      }

      if (Object.keys(updateData).length === 0) {
        onClose();
        return;
      }

      await onSave(site.id, updateData);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to update site.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLaunchMapEditor = () => {
    onClose();
    onStartEditBoundaryOnMap(site);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="card-container"
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid var(--color-line)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--color-line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#86EFAC',
              }}
            >
              <Pencil size={18} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  margin: 0,
                  color: '#FFFFFF',
                }}
              >
                Edit Conservation Site
              </h2>
              <p
                style={{
                  fontSize: '12px',
                  color: '#94A3B8',
                  margin: '2px 0 0 0',
                }}
              >
                {site.name} • {projectName || 'Conservation Sector'}
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

        {/* Ownership Badge */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            padding: '8px 24px',
            fontSize: '11px',
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
              color: '#475569',
            }}
          >
            <ShieldCheck size={14} color="#059669" />
            <span>Authorized Editor:</span>
            <strong style={{ color: '#0F172A' }}>
              {currentUser?.role === 'admin'
                ? 'Operations Admin (Full Access)'
                : isOwner
                  ? `${currentUser?.full_name || 'You'} (Site Creator)`
                  : 'Authorized Personnel'}
            </strong>
          </div>
          <span
            style={{
              backgroundColor: '#ECFDF5',
              color: '#065F46',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontWeight: 700,
              fontSize: '10px',
              border: '1px solid #A7F3D0',
            }}
          >
            Ownership Verified
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {errorMsg && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#B91C1C',
                fontSize: '12px',
              }}
            >
              <AlertTriangle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Site Name Field */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-ink)',
                marginBottom: '6px',
              }}
            >
              Conservation Site Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="e.g. Kozhikode Rainforest Parcel 2"
              required
              style={{ height: '38px', fontSize: '13px' }}
            />
          </div>

          {/* Ecosystem Classification Field */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-ink)',
                marginBottom: '6px',
              }}
            >
              Ecosystem Classification
            </label>
            <select
              value={siteType}
              onChange={(e) => setSiteType(e.target.value as SiteType)}
              className="input-field"
              style={{ height: '38px', fontSize: '13px' }}
            >
              <option value="mixed">
                Mixed Ecosystem (Reforestation / Agroforestry / Wetland)
              </option>
              <option value="carbon">Carbon Sequestration Reserve</option>
              <option value="biodiversity">
                Biodiversity Protection Sanctuary
              </option>
            </select>
          </div>

          {/* Boundary Modification Card */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1.5px solid #E2E8F0',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <MapPin size={15} className="text-emerald-600" />
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0F172A',
                  }}
                >
                  Spatial Boundary Geometry
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#059669',
                  backgroundColor: '#ECFDF5',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  border: '1px solid #A7F3D0',
                }}
              >
                {vertexCount} vertices •{' '}
                {site.area_hectares
                  ? `${site.area_hectares.toFixed(2)} ha`
                  : 'N/A'}
              </span>
            </div>

            <p
              style={{
                fontSize: '11px',
                color: '#64748B',
                margin: '0 0 12px 0',
                lineHeight: 1.4,
              }}
            >
              Choose how you want to adjust the polygon boundary: drag existing
              vertices directly on the GIS map, or upload an updated GeoJSON
              polygon.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
              }}
            >
              {/* Option A: Adjust on Map */}
              <button
                type="button"
                onClick={handleLaunchMapEditor}
                className="btn-secondary"
                style={{
                  height: '36px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#065F46',
                  backgroundColor: '#ECFDF5',
                  borderColor: '#A7F3D0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(5, 150, 105, 0.1)',
                }}
              >
                <Pencil size={13} />
                Adjust on Map
              </button>

              {/* Option B: Upload Replacement GeoJSON */}
              <label
                className="btn-secondary"
                style={{
                  height: '36px',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  margin: 0,
                }}
              >
                <Upload size={13} />
                <span>Upload GeoJSON</span>
                <input
                  type="file"
                  accept=".geojson,.json"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {uploadedFileName && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '6px 10px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '6px',
                  border: '1px solid #10B981',
                  fontSize: '11px',
                  color: '#065F46',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle2 size={13} color="#10B981" />
                <span>
                  New boundary loaded from <strong>{uploadedFileName}</strong> (
                  {vertexCount} vertices)
                </span>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div
            style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ height: '36px', fontSize: '12px', padding: '0 16px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ height: '36px', fontSize: '12px', padding: '0 18px' }}
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
