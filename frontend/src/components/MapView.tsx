import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { Site, GeoJSONPolygon, UserRole } from '../types';
import { Plus, Trash2, MapPin, Navigation } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface MapViewProps {
  sites: Site[];
  selectedSite: Site | null;
  onSelectSite: (site: Site) => void;
  onPolygonDrawn: (geojson: GeoJSONPolygon | null) => void;
  onOpenSiteForm: () => void;
  isDrawing: boolean;
  setIsDrawing: (drawing: boolean) => void;
  drawnGeoJSON: GeoJSONPolygon | null;
  userRole?: UserRole;
}

export const MapView: React.FC<MapViewProps> = ({
  sites,
  selectedSite,
  onSelectSite,
  onPolygonDrawn,
  onOpenSiteForm,
  isDrawing,
  setIsDrawing,
  drawnGeoJSON,
  userRole,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);

  const [mouseCoords, setMouseCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [mapStyle, setMapStyle] = useState<'light' | 'satellite' | 'outdoors'>('light');

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (MAPBOX_TOKEN) {
      mapboxgl.accessToken = MAPBOX_TOKEN;
    }

    const styleUrl = MAPBOX_TOKEN
      ? mapStyle === 'satellite'
        ? 'mapbox://styles/mapbox/satellite-v9'
        : mapStyle === 'outdoors'
        ? 'mapbox://styles/mapbox/outdoors-v12'
        : 'mapbox://styles/mapbox/light-v11'
      : {
          version: 8,
          sources: {
            'carto-light': {
              type: 'raster',
              tiles: ['https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap, &copy; CARTO',
            },
          },
          layers: [
            {
              id: 'carto-light-layer',
              type: 'raster',
              source: 'carto-light',
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        };

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: styleUrl as string | mapboxgl.Style,
      center: [75.82, 11.27],
      zoom: 10,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-left');

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      styles: [
        {
          id: 'gl-draw-polygon-fill-inactive',
          type: 'fill',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
          paint: {
            'fill-color': '#0D9488',
            'fill-opacity': 0.25,
          },
        },
        {
          id: 'gl-draw-polygon-stroke-inactive',
          type: 'line',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
          paint: {
            'line-color': '#0D9488',
            'line-width': 2,
          },
        },
        {
          id: 'gl-draw-polygon-fill-active',
          type: 'fill',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          paint: {
            'fill-color': '#059669',
            'fill-opacity': 0.4,
          },
        },
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          paint: {
            'line-color': '#0F172A',
            'line-width': 2,
            'line-dasharray': [0.2, 2],
          },
        },
      ],
    });

    map.addControl(draw as unknown as mapboxgl.IControl, 'top-right');
    mapRef.current = map;
    drawRef.current = draw;

    // Track mouse coordinates for HUD
    map.on('mousemove', (e) => {
      setMouseCoords({
        lng: Number(e.lngLat.lng.toFixed(5)),
        lat: Number(e.lngLat.lat.toFixed(5)),
      });
    });

    const handleDrawUpdate = () => {
      const data = draw.getAll();
      if (data.features.length > 0) {
        const latestFeature = data.features[data.features.length - 1];
        if (latestFeature.geometry.type === 'Polygon') {
          onPolygonDrawn(latestFeature.geometry as GeoJSONPolygon);
        }
      }
    };

    map.on('draw.create', handleDrawUpdate);
    map.on('draw.update', handleDrawUpdate);

    return () => {
      map.remove();
    };
  }, [onPolygonDrawn, mapStyle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateLayers = () => {
      const sourceId = 'sites-geojson-source';

      const featureCollection = {
        type: 'FeatureCollection',
        features: sites
          .filter((s) => s.geojson && s.geojson.type === 'Polygon')
          .map((site) => ({
            type: 'Feature',
            id: site.id,
            properties: {
              id: site.id,
              name: site.name,
              site_type: site.site_type,
              area_hectares: site.area_hectares,
              isSelected: selectedSite?.id === site.id,
            },
            geometry: site.geojson,
          })),
      };

      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(
          featureCollection as unknown as GeoJSON.FeatureCollection
        );
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: featureCollection as unknown as GeoJSON.FeatureCollection,
        });

        map.addLayer({
          id: 'sites-fill',
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': [
              'case',
              ['boolean', ['get', 'isSelected'], false],
              '#059669',
              '#0D9488',
            ],
            'fill-opacity': [
              'case',
              ['boolean', ['get', 'isSelected'], false],
              0.45,
              0.25,
            ],
          },
        });

        map.addLayer({
          id: 'sites-stroke',
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': [
              'case',
              ['boolean', ['get', 'isSelected'], false],
              '#0F172A',
              '#0D9488',
            ],
            'line-width': [
              'case',
              ['boolean', ['get', 'isSelected'], false],
              3,
              1.5,
            ],
          },
        });

        map.on('click', 'sites-fill', (e) => {
          if (e.features && e.features[0]) {
            const siteId = e.features[0].properties?.id;
            const clickedSite = sites.find((s) => s.id === siteId);
            if (clickedSite) {
              onSelectSite(clickedSite);
            }
          }
        });

        map.on('mouseenter', 'sites-fill', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'sites-fill', () => {
          map.getCanvas().style.cursor = '';
        });
      }
    };

    if (map.isStyleLoaded()) {
      updateLayers();
    } else {
      map.once('load', updateLayers);
    }
  }, [sites, selectedSite, onSelectSite]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || sites.length === 0) return;

    if (selectedSite && selectedSite.geojson && selectedSite.geojson.coordinates) {
      const coords = selectedSite.geojson.coordinates[0];
      const bounds = coords.reduce(
        (b, coord) => b.extend(coord as [number, number]),
        new mapboxgl.LngLatBounds(
          coords[0] as [number, number],
          coords[0] as [number, number]
        )
      );
      map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 800 });
    }
  }, [selectedSite, sites]);

  const handleStartDraw = () => {
    if (drawRef.current) {
      drawRef.current.deleteAll();
      drawRef.current.changeMode('draw_polygon');
      setIsDrawing(true);
    }
  };

  const handleClearDraw = () => {
    if (drawRef.current) {
      drawRef.current.deleteAll();
      setIsDrawing(false);
      onPolygonDrawn(null);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating Top Control Toolbar */}
      <div
        className="card-container"
        style={{
          position: 'absolute',
          top: '16px',
          left: '60px',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 5,
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--color-ink)',
          }}
        >
          <MapPin size={15} color="var(--color-teal)" />
          <span className="font-mono">{sites.length}</span> sites mapped
        </div>

        {/* Map style selector */}
        {MAPBOX_TOKEN && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setMapStyle('light')}
              className={mapStyle === 'light' ? 'btn-primary' : 'btn-secondary'}
              style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
            >
              Light
            </button>
            <button
              onClick={() => setMapStyle('satellite')}
              className={mapStyle === 'satellite' ? 'btn-primary' : 'btn-secondary'}
              style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapStyle('outdoors')}
              className={mapStyle === 'outdoors' ? 'btn-primary' : 'btn-secondary'}
              style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
            >
              Outdoors
            </button>
          </div>
        )}

        {(userRole === 'admin' || userRole === 'analyst') && (
          <>
            <div
              style={{
                height: '16px',
                width: '1px',
                backgroundColor: 'var(--color-line)',
              }}
            />

            <button
              onClick={handleStartDraw}
              className="btn-canopy"
              style={{ height: '26px', fontSize: '11px', padding: '0 10px' }}
            >
              <Plus size={13} />
              Draw site polygon
            </button>

            {drawnGeoJSON && (
              <button
                onClick={onOpenSiteForm}
                className="btn-primary"
                style={{
                  backgroundColor: 'var(--color-emerald)',
                  borderColor: 'var(--color-emerald)',
                  height: '26px',
                  fontSize: '11px',
                  padding: '0 10px',
                }}
              >
                Save drawn polygon
              </button>
            )}

            {isDrawing && (
              <button
                onClick={handleClearDraw}
                className="btn-secondary"
                style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
              >
                <Trash2 size={12} />
                Cancel
              </button>
            )}
          </>
        )}
      </div>

      {/* Floating Bottom-Right Coordinate & Viewport HUD */}
      <div
        className="card-container font-mono"
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          padding: '6px 12px',
          fontSize: '11px',
          color: 'var(--color-ink-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 5,
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Navigation size={11} color="var(--color-teal)" />
          <span>CURSOR:</span>
          <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>
            {mouseCoords ? `${mouseCoords.lat}° N, ${mouseCoords.lng}° E` : 'Hover map...'}
          </span>
        </div>
        <span style={{ opacity: 0.4 }}>|</span>
        <span>EPSG:4326</span>
      </div>
    </div>
  );
};

