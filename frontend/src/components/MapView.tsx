import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { Site, GeoJSONPolygon } from '../types';
import { Plus, Trash2, MapPin } from 'lucide-react';

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
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (MAPBOX_TOKEN) {
      mapboxgl.accessToken = MAPBOX_TOKEN;
    }

    const style: string | mapboxgl.Style = MAPBOX_TOKEN
      ? 'mapbox://styles/mapbox/light-v11'
      : {
          version: 8,
          sources: {
            'carto-light': {
              type: 'raster',
              tiles: [
                'https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png',
              ],
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
      style,
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
          filter: [
            'all',
            ['==', 'active', 'false'],
            ['==', '$type', 'Polygon'],
          ],
          paint: {
            'fill-color': '#2F5233',
            'fill-opacity': 0.25,
          },
        },
        {
          id: 'gl-draw-polygon-stroke-inactive',
          type: 'line',
          filter: [
            'all',
            ['==', 'active', 'false'],
            ['==', '$type', 'Polygon'],
          ],
          paint: {
            'line-color': '#2F5233',
            'line-width': 2,
          },
        },
        {
          id: 'gl-draw-polygon-fill-active',
          type: 'fill',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          paint: {
            'fill-color': '#7A9B76',
            'fill-opacity': 0.4,
          },
        },
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          paint: {
            'line-color': '#2F5233',
            'line-width': 2,
            'line-dasharray': [0.2, 2],
          },
        },
      ],
    });

    map.addControl(draw as unknown as mapboxgl.IControl, 'top-right');
    mapRef.current = map;
    drawRef.current = draw;

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
  }, [onPolygonDrawn]);

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
              '#7A9B76',
              '#2F5233',
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
              '#1C2B22',
              '#2F5233',
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

    if (
      selectedSite &&
      selectedSite.geojson &&
      selectedSite.geojson.coordinates
    ) {
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

      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '60px',
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--color-line)',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 5,
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <MapPin size={16} color="var(--color-canopy)" />
          {sites.length} sites mapped
        </div>

        <div
          style={{
            height: '16px',
            width: '1px',
            backgroundColor: 'var(--color-line)',
          }}
        />

        <button
          onClick={handleStartDraw}
          className="btn-primary"
          style={{ padding: '6px 12px', fontSize: '12px' }}
        >
          <Plus size={14} />
          Draw site polygon
        </button>

        {drawnGeoJSON && (
          <button
            onClick={onOpenSiteForm}
            className="btn-primary"
            style={{
              backgroundColor: 'var(--color-moss)',
              borderColor: 'var(--color-moss)',
              padding: '6px 12px',
              fontSize: '12px',
            }}
          >
            Save drawn polygon
          </button>
        )}

        {isDrawing && (
          <button
            onClick={handleClearDraw}
            className="btn-secondary"
            style={{ padding: '6px 10px', fontSize: '12px' }}
          >
            <Trash2 size={12} />
            Cancel draw
          </button>
        )}
      </div>
    </div>
  );
};
