import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { Site, GeoJSONPolygon, GeoJSONGeometry, UserRole } from '../types';
import {
  Trash2,
  MapPin,
  Navigation,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

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
  searchQuery?: string;
  editingBoundarySite?: Site | null;
  onSaveEditedBoundary?: (
    siteId: number,
    updatedGeoJSON: GeoJSONPolygon
  ) => Promise<void>;
  onCancelEditBoundary?: () => void;
}

const getStyleUrl = (style: 'light' | 'satellite' | 'outdoors') => {
  if (MAPBOX_TOKEN) {
    return style === 'satellite'
      ? 'mapbox://styles/mapbox/satellite-streets-v12'
      : style === 'outdoors'
        ? 'mapbox://styles/mapbox/outdoors-v12'
        : 'mapbox://styles/mapbox/light-v11';
  }
  if (style === 'satellite') {
    return {
      version: 8,
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: '&copy; Esri',
        },
      },
      layers: [
        {
          id: 'esri-satellite-layer',
          type: 'raster',
          source: 'esri-satellite',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    };
  }
  if (style === 'outdoors') {
    return {
      version: 8,
      sources: {
        'osm-outdoors': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap contributors',
        },
      },
      layers: [
        {
          id: 'osm-outdoors-layer',
          type: 'raster',
          source: 'osm-outdoors',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    };
  }
  return {
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
};

const DRAW_STYLES = [
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
      'fill-opacity': 0.35,
    },
  },
  {
    id: 'gl-draw-polygon-stroke-active',
    type: 'line',
    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
    paint: {
      'line-color': '#131b2e',
      'line-width': 2.5,
      'line-dasharray': [0.2, 2],
    },
  },
  {
    id: 'gl-draw-line-active',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString'], ['==', 'active', 'true']],
    paint: {
      'line-color': '#059669',
      'line-width': 3,
      'line-dasharray': [2, 2],
    },
  },
  {
    id: 'gl-draw-line-inactive',
    type: 'line',
    filter: ['all', ['==', '$type', 'LineString'], ['==', 'active', 'false']],
    paint: {
      'line-color': '#0D9488',
      'line-width': 2,
    },
  },
  {
    id: 'gl-draw-polygon-and-line-vertex-stroke-inactive',
    type: 'circle',
    filter: [
      'all',
      ['==', 'meta', 'vertex'],
      ['==', '$type', 'Point'],
      ['!=', 'mode', 'static'],
    ],
    paint: {
      'circle-radius': 7,
      'circle-color': '#ffffff',
    },
  },
  {
    id: 'gl-draw-polygon-and-line-vertex-inactive',
    type: 'circle',
    filter: [
      'all',
      ['==', 'meta', 'vertex'],
      ['==', '$type', 'Point'],
      ['!=', 'mode', 'static'],
    ],
    paint: {
      'circle-radius': 5,
      'circle-color': '#059669',
    },
  },
  {
    id: 'gl-draw-polygon-and-line-vertex-active',
    type: 'circle',
    filter: [
      'all',
      ['==', 'meta', 'vertex'],
      ['==', '$type', 'Point'],
      ['==', 'active', 'true'],
    ],
    paint: {
      'circle-radius': 8,
      'circle-color': '#131b2e',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#85f8c4',
    },
  },
  {
    id: 'gl-draw-point-active',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'active', 'true']],
    paint: {
      'circle-radius': 9,
      'circle-color': '#059669',
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff',
    },
  },
  {
    id: 'gl-draw-point-inactive',
    type: 'circle',
    filter: ['all', ['==', '$type', 'Point'], ['==', 'active', 'false']],
    paint: {
      'circle-radius': 6,
      'circle-color': '#0D9488',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  },
];

const createDrawControl = () => {
  return new MapboxDraw({
    displayControlsDefault: false,
    controls: {
      polygon: true,
      trash: true,
    },
    styles: DRAW_STYLES,
  });
};

export const MapView: React.FC<MapViewProps> = ({
  sites,
  selectedSite,
  onSelectSite,
  onPolygonDrawn,
  onOpenSiteForm,
  isDrawing,
  setIsDrawing,
  drawnGeoJSON,
  searchQuery = '',
  editingBoundarySite,
  onSaveEditedBoundary,
  onCancelEditBoundary,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);

  const [mouseCoords, setMouseCoords] = useState<{
    lng: number;
    lat: number;
  } | null>(null);
  const [clickCount, setClickCount] = useState<number>(0);
  const [isSavingBoundary, setIsSavingBoundary] = useState<boolean>(false);
  const [mapStyle, setMapStyle] = useState<'light' | 'satellite' | 'outdoors'>(
    () => {
      const saved = localStorage.getItem('darukaa_map_style');
      return saved === 'satellite' || saved === 'outdoors' || saved === 'light'
        ? saved
        : 'light';
    }
  );

  const sitesRef = useRef<Site[]>(sites);
  useEffect(() => {
    sitesRef.current = sites;
  }, [sites]);

  const selectedSiteRef = useRef<Site | null>(selectedSite);
  useEffect(() => {
    selectedSiteRef.current = selectedSite;
  }, [selectedSite]);

  const onSelectSiteRef = useRef(onSelectSite);
  useEffect(() => {
    onSelectSiteRef.current = onSelectSite;
  }, [onSelectSite]);

  const editingBoundarySiteRef = useRef<Site | null>(
    editingBoundarySite || null
  );
  useEffect(() => {
    editingBoundarySiteRef.current = editingBoundarySite || null;
  }, [editingBoundarySite]);
  const activeEditingSiteIdRef = useRef<number | null>(null);

  const updateLayersRef = useRef<() => void>(() => {});

  const zoomToSite = useCallback((siteToZoom: Site) => {
    const map = mapRef.current;
    if (!map) return;

    let geom: GeoJSONGeometry | null = null;
    if (typeof siteToZoom.geojson === 'string') {
      try {
        geom = JSON.parse(
          siteToZoom.geojson as unknown as string
        ) as GeoJSONGeometry;
      } catch {
        geom = null;
      }
    } else {
      geom = siteToZoom.geojson as GeoJSONGeometry;
    }
    if (!geom || !geom.coordinates) return;

    let rawCoords: number[][] = [];
    if (
      geom.type === 'Polygon' &&
      Array.isArray(geom.coordinates) &&
      geom.coordinates.length > 0
    ) {
      rawCoords = geom.coordinates[0];
    } else if (
      geom.type === 'MultiPolygon' &&
      Array.isArray(geom.coordinates) &&
      geom.coordinates.length > 0 &&
      Array.isArray(geom.coordinates[0]) &&
      geom.coordinates[0].length > 0
    ) {
      rawCoords = geom.coordinates[0][0];
    }

    const validCoords = rawCoords.filter(
      (c) =>
        Array.isArray(c) &&
        c.length >= 2 &&
        typeof c[0] === 'number' &&
        typeof c[1] === 'number' &&
        !isNaN(c[0]) &&
        !isNaN(c[1])
    );

    if (validCoords.length === 0) return;

    const bounds = validCoords.reduce(
      (b, coord) => b.extend(coord as [number, number]),
      new mapboxgl.LngLatBounds(
        validCoords[0] as [number, number],
        validCoords[0] as [number, number]
      )
    );

    const performFit = () => {
      const currentMap = mapRef.current;
      if (!currentMap) return;

      currentMap.resize();
      updateLayersRef.current?.();

      const containerWidth =
        mapContainerRef.current?.clientWidth || window.innerWidth;
      // Account for the 440px inspector panel on the right so polygon is centered in the visible area
      const rightPadding =
        containerWidth > 900
          ? 460
          : Math.max(40, Math.floor(containerWidth * 0.35));

      currentMap.fitBounds(bounds, {
        padding: { top: 70, bottom: 70, left: 70, right: rightPadding },
        maxZoom: 14.5,
        duration: 800,
      });
    };

    if (map.isStyleLoaded()) {
      performFit();
    } else {
      map.once('style.load', performFit);
    }

    // Schedule retries at 150ms, 450ms, 900ms to guarantee camera positioning on reload and after layout settles
    const t1 = setTimeout(performFit, 150);
    const t2 = setTimeout(performFit, 450);
    const t3 = setTimeout(performFit, 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const updateLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const sourceId = 'sites-geojson-source';
    const trimmedQuery = searchQuery.trim().toLowerCase();
    const currentSites = sitesRef.current;
    const editingId = editingBoundarySiteRef.current?.id;
    const availableSites = editingId
      ? currentSites.filter((s) => s.id !== editingId)
      : currentSites;
    const filteredSites = trimmedQuery
      ? availableSites.filter(
          (s) =>
            s.name.toLowerCase().includes(trimmedQuery) ||
            s.site_type.toLowerCase().includes(trimmedQuery)
        )
      : availableSites;

    const currentSelected = selectedSiteRef.current;
    const featureCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: filteredSites
        .map((site) => {
          let geom: GeoJSONGeometry | null = null;
          if (typeof site.geojson === 'string') {
            try {
              geom = JSON.parse(
                site.geojson as unknown as string
              ) as GeoJSONGeometry;
            } catch {
              geom = null;
            }
          } else {
            geom = site.geojson as GeoJSONGeometry;
          }
          if (!geom || !geom.type || !geom.coordinates) return null;
          return {
            type: 'Feature' as const,
            id: site.id,
            properties: {
              id: site.id,
              name: site.name,
              site_type: site.site_type,
              area_hectares: site.area_hectares,
              isSelected: currentSelected?.id === site.id,
            },
            geometry: geom as unknown as GeoJSON.Geometry,
          };
        })
        .filter(Boolean) as GeoJSON.Feature[],
    };

    try {
      const existingSrc = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
      if (existingSrc) {
        existingSrc.setData(featureCollection);
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: featureCollection,
        });
      }

      if (!map.getLayer('sites-fill')) {
        map.addLayer({
          id: 'sites-fill',
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': [
              'case',
              ['boolean', ['get', 'isSelected'], false],
              '#10B981',
              '#0D9488',
            ],
            'fill-opacity': [
              'case',
              ['boolean', ['get', 'isSelected'], false],
              0.65,
              0.4,
            ],
          },
        });

        map.on('click', 'sites-fill', (e) => {
          if (e.features && e.features[0]) {
            const siteId = e.features[0].properties?.id;
            const clickedSite = sitesRef.current.find((s) => s.id === siteId);
            if (clickedSite && onSelectSiteRef.current) {
              onSelectSiteRef.current(clickedSite);
            }
          }
        });

        map.on('mouseenter', 'sites-fill', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'sites-fill', () => {
          map.getCanvas().style.cursor = '';
        });
      } else {
        map.setLayoutProperty('sites-fill', 'visibility', 'visible');
      }

      if (!map.getLayer('sites-stroke')) {
        map.addLayer({
          id: 'sites-stroke',
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': [
              'case',
              ['boolean', ['get', 'isSelected'], false],
              '#047857',
              '#0F172A',
            ],
            'line-width': [
              'case',
              ['boolean', ['get', 'isSelected'], false],
              4,
              2.5,
            ],
          },
        });
      } else {
        map.setLayoutProperty('sites-stroke', 'visibility', 'visible');
      }

      map.triggerRepaint();
    } catch {
      // Style was in transition; styledata or idle will self-heal
    }

    map.resize();
    map.triggerRepaint();
  }, [searchQuery]);

  // Synchronize updateLayersRef with latest updateLayers function
  useEffect(() => {
    updateLayersRef.current = updateLayers;
  }, [updateLayers]);

  // Handle switching map theme smoothly without losing custom layers or crashing MapboxDraw
  const handleThemeChange = useCallback(
    (newStyle: 'light' | 'satellite' | 'outdoors') => {
      if (mapStyle === newStyle) return;
      setMapStyle(newStyle);
      localStorage.setItem('darukaa_map_style', newStyle);

      const map = mapRef.current;
      if (!map) return;

      // 1. Remove draw control safely before changing style to prevent MapboxDraw from crashing on wiped sources
      if (drawRef.current) {
        try {
          map.removeControl(drawRef.current as unknown as mapboxgl.IControl);
        } catch {
          // ignore
        }
        drawRef.current = null;
      }

      // 2. Set new style
      const styleUrl = getStyleUrl(newStyle);
      map.setStyle(styleUrl as string | mapboxgl.Style);

      // 3. Callback when the new style is ready to accept sources/layers
      const onStyleReady = () => {
        const currentMap = mapRef.current;
        if (!currentMap) return;

        // Re-add draw control cleanly for the new style
        if (!drawRef.current) {
          try {
            const draw = createDrawControl();
            currentMap.addControl(
              draw as unknown as mapboxgl.IControl,
              'top-right'
            );
            drawRef.current = draw;
          } catch {
            // ignore
          }
        }

        // Re-inject site polygon layers immediately
        updateLayersRef.current?.();

        if (selectedSiteRef.current) {
          zoomToSite(selectedSiteRef.current);
        }
      };

      map.once('style.load', onStyleReady);
      map.once('idle', onStyleReady);

      // Pulse retries to guarantee custom layers even under slow network or delayed style parsing
      setTimeout(onStyleReady, 100);
      setTimeout(onStyleReady, 300);
      setTimeout(onStyleReady, 700);
      setTimeout(onStyleReady, 1200);
    },
    [mapStyle, zoomToSite]
  );

  // Initial Map creation (runs ONCE on mount)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    if (MAPBOX_TOKEN) {
      mapboxgl.accessToken = MAPBOX_TOKEN;
    }

    const styleUrl = getStyleUrl(mapStyle);

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: styleUrl as string | mapboxgl.Style,
      center: [75.82, 11.27],
      zoom: 10,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-left');

    const draw = createDrawControl();
    map.addControl(draw as unknown as mapboxgl.IControl, 'top-right');
    mapRef.current = map;
    drawRef.current = draw;

    map.on('mousemove', (e) => {
      setMouseCoords({
        lng: Number(e.lngLat.lng.toFixed(5)),
        lat: Number(e.lngLat.lat.toFixed(5)),
      });
    });

    map.on('click', (e: mapboxgl.MapMouseEvent) => {
      if (draw.getMode() === 'draw_polygon') {
        const target = e.originalEvent?.target as HTMLElement | undefined;
        if (target && !target.classList.contains('mapboxgl-canvas')) {
          return;
        }
        setClickCount((prev) => prev + 1);
      }
    });

    const handleDrawUpdate = () => {
      // If editing an existing boundary, ignore draw events so vertex dragging does not trigger drawing a new site!
      if (editingBoundarySiteRef.current) {
        return;
      }
      const currentDraw = drawRef.current;
      if (!currentDraw) return;
      const data = currentDraw.getAll();
      if (data.features.length > 0) {
        const latestFeature = data.features[data.features.length - 1];
        if (latestFeature.geometry.type === 'Polygon') {
          onPolygonDrawn(latestFeature.geometry as GeoJSONPolygon);
          setIsDrawing(false);
          setClickCount(0);
        }
      }
    };

    map.on('draw.create', handleDrawUpdate);
    map.on('draw.update', handleDrawUpdate);
    map.on('draw.modechange', (e: { mode: string }) => {
      const active = e.mode === 'draw_polygon';
      setIsDrawing(active);
      if (!active) {
        setClickCount(0);
      }
    });

    map.on('load', () => {
      if (updateLayersRef.current) {
        updateLayersRef.current();
      }
      const startDraw = localStorage.getItem('darukaa_start_draw');
      if (startDraw === 'true') {
        localStorage.removeItem('darukaa_start_draw');
        if (drawRef.current) {
          drawRef.current.deleteAll();
          drawRef.current.changeMode('draw_polygon');
          setIsDrawing(true);
        }
      }

      const jumpCoords = localStorage.getItem('darukaa_jump_coords');
      if (jumpCoords) {
        localStorage.removeItem('darukaa_jump_coords');
        try {
          const [lat, lng] = JSON.parse(jumpCoords);
          if (typeof lat === 'number' && typeof lng === 'number') {
            map.flyTo({ center: [lng, lat], zoom: 13, duration: 1200 });
          }
        } catch {
          // ignore
        }
      }
    });

    map.on('style.load', () => {
      updateLayersRef.current?.();
    });

    // Self-healing: if style reloaded or idle event fires and layers are missing, restore them immediately
    const ensureLayersExist = () => {
      const currentMap = mapRef.current;
      if (!currentMap) return;
      try {
        if (
          !currentMap.getSource('sites-geojson-source') ||
          !currentMap.getLayer('sites-fill')
        ) {
          updateLayersRef.current?.();
        }
      } catch {
        // ignore
      }
    };

    map.on('styledata', ensureLayersExist);
    map.on('idle', ensureLayersExist);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update layers whenever sites, selectedSite, or searchQuery change
  useEffect(() => {
    updateLayers();

    // Pulse updates at 100ms, 300ms, 600ms to guarantee layer rendering on mount/tab switches
    const t1 = setTimeout(() => updateLayersRef.current?.(), 100);
    const t2 = setTimeout(() => updateLayersRef.current?.(), 300);
    const t3 = setTimeout(() => updateLayersRef.current?.(), 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [sites, selectedSite, updateLayers]);

  // Ensure map canvas resizes, repaints layers, and zooms to selected site on initial load
  useEffect(() => {
    if (selectedSite) {
      zoomToSite(selectedSite);
    }
    const t = setTimeout(() => {
      const map = mapRef.current;
      if (map) {
        map.resize();
        updateLayers();
        if (selectedSiteRef.current) {
          zoomToSite(selectedSiteRef.current);
        }
      }
    }, 350);
    return () => clearTimeout(t);
  }, [sites.length, selectedSite, updateLayers, zoomToSite]);

  // Auto-fit map to all loaded sites ONLY if NO site is selected and no saved site is pending in localStorage
  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedSite || sites.length === 0) return;

    // Check if there is a saved site that will be loaded shortly
    const savedSiteId = localStorage.getItem('darukaa_selected_site_id');
    if (savedSiteId && sites.some((s) => s.id === Number(savedSiteId))) {
      return;
    }

    const allCoords: [number, number][] = [];
    sites.forEach((site) => {
      let geom: GeoJSONGeometry | null = null;
      if (typeof site.geojson === 'string') {
        try {
          geom = JSON.parse(
            site.geojson as unknown as string
          ) as GeoJSONGeometry;
        } catch {
          geom = null;
        }
      } else {
        geom = site.geojson as GeoJSONGeometry;
      }
      if (geom && geom.coordinates) {
        let raw: number[][] = [];
        if (
          geom.type === 'Polygon' &&
          Array.isArray(geom.coordinates) &&
          geom.coordinates.length > 0
        ) {
          raw = geom.coordinates[0];
        } else if (
          geom.type === 'MultiPolygon' &&
          Array.isArray(geom.coordinates) &&
          geom.coordinates.length > 0 &&
          Array.isArray(geom.coordinates[0]) &&
          geom.coordinates[0].length > 0
        ) {
          raw = geom.coordinates[0][0];
        }
        raw.forEach((c) => {
          if (
            Array.isArray(c) &&
            c.length >= 2 &&
            typeof c[0] === 'number' &&
            typeof c[1] === 'number' &&
            !isNaN(c[0]) &&
            !isNaN(c[1])
          ) {
            allCoords.push([c[0], c[1]]);
          }
        });
      }
    });

    if (allCoords.length > 0) {
      const bounds = allCoords.reduce(
        (b, coord) => b.extend(coord),
        new mapboxgl.LngLatBounds(allCoords[0], allCoords[0])
      );

      const doFit = () => {
        if (!mapRef.current) return;
        mapRef.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 12,
          duration: 800,
        });
      };

      if (!map.isStyleLoaded()) {
        map.once('style.load', doFit);
      } else {
        doFit();
      }
    }
  }, [sites, selectedSite]);

  // Zoom to selected site whenever selectedSite updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedSite) return;
    zoomToSite(selectedSite);
  }, [selectedSite, zoomToSite]);

  useEffect(() => {
    if (!drawRef.current) return;
    if (isDrawing) {
      if (drawRef.current.getMode() !== 'draw_polygon') {
        drawRef.current.deleteAll();
        drawRef.current.changeMode('draw_polygon');
        setClickCount(0);
        onPolygonDrawn(null);
      }
    } else {
      if (drawRef.current.getMode() === 'draw_polygon') {
        drawRef.current.changeMode('simple_select');
        setClickCount(0);
      }
    }
  }, [isDrawing, onPolygonDrawn]);

  // Synchronize MapboxDraw: if drawnGeoJSON is cleared externally (e.g. Header Cancel or Modal Discard), purge features
  useEffect(() => {
    if (!drawnGeoJSON && drawRef.current) {
      try {
        const features = drawRef.current.getAll()?.features || [];
        if (features.length > 0 && !isDrawing) {
          drawRef.current.deleteAll();
          drawRef.current.changeMode('simple_select');
          setClickCount(0);
        }
      } catch {
        // ignore
      }
    }
  }, [drawnGeoJSON, isDrawing]);

  const handleClearDraw = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (drawRef.current) {
      try {
        drawRef.current.deleteAll();
        drawRef.current.changeMode('simple_select');
      } catch {
        // ignore
      }
    }
    setIsDrawing(false);
    setClickCount(0);
    onPolygonDrawn(null);
  };

  // When editingBoundarySite is activated, load its polygon into MapboxDraw in direct_select mode
  useEffect(() => {
    const draw = drawRef.current;
    if (!draw) return;

    if (editingBoundarySite && editingBoundarySite.geojson) {
      if (activeEditingSiteIdRef.current !== editingBoundarySite.id) {
        try {
          draw.deleteAll();
          const featureIds = draw.add({
            type: 'Feature',
            id: `edit-site-${editingBoundarySite.id}`,
            properties: {},
            geometry:
              editingBoundarySite.geojson as unknown as GeoJSON.Geometry,
          } as unknown as GeoJSON.Feature);
          if (featureIds && featureIds.length > 0) {
            draw.changeMode('direct_select', { featureId: featureIds[0] });
          }
          activeEditingSiteIdRef.current = editingBoundarySite.id;
          updateLayers();
        } catch (err) {
          console.error('Failed to load polygon for boundary editing:', err);
        }
      }
    } else {
      if (activeEditingSiteIdRef.current !== null) {
        activeEditingSiteIdRef.current = null;
        try {
          draw.deleteAll();
          draw.changeMode('simple_select');
        } catch {
          // ignore
        }
        updateLayers();
      }
    }
  }, [editingBoundarySite, updateLayers]);

  const handleSaveEditedBoundaryClick = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const draw = drawRef.current;
    if (
      !draw ||
      !editingBoundarySite ||
      !onSaveEditedBoundary ||
      isSavingBoundary
    )
      return;
    setIsSavingBoundary(true);
    try {
      const all = draw.getAll();
      const feat = all.features.find((f) => f.geometry.type === 'Polygon');
      if (feat && feat.geometry.type === 'Polygon') {
        const poly = feat.geometry as GeoJSONPolygon;
        if (poly.coordinates && poly.coordinates.length > 0) {
          const ring = poly.coordinates[0];
          if (ring.length >= 3) {
            const first = ring[0];
            const last = ring[ring.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
              ring.push([first[0], first[1]]);
            }
          }
        }
        await onSaveEditedBoundary(editingBoundarySite.id, poly);
        activeEditingSiteIdRef.current = null;
        draw.deleteAll();
        draw.changeMode('simple_select');
      } else {
        alert(
          'Could not detect polygon geometry in editor. Please adjust boundary points or click Cancel.'
        );
      }
    } catch (err: unknown) {
      console.error('Failed to save boundary:', err);
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Failed to save updated boundary. Please check your permissions.';
      alert(errorMsg);
    } finally {
      setIsSavingBoundary(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating Top Map Controls Container */}
      <div
        className="print:hidden"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: '14px',
          left: '56px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          zIndex: 10,
          maxWidth: 'calc(100% - 120px)',
          pointerEvents: 'none',
        }}
      >
        {/* Base Map Style & Counter Pill */}
        <div
          className="card-container"
          style={{
            padding: '5px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            boxShadow:
              '0 4px 12px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.05)',
            border: '1px solid #E2E8F0',
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              color: 'var(--color-ink)',
            }}
          >
            <MapPin size={14} color="var(--color-teal)" />
            <span className="font-mono">{sites.length}</span> sites mapped
          </div>

          <div
            style={{
              height: '14px',
              width: '1px',
              backgroundColor: '#E2E8F0',
            }}
          />

          {/* Map style selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <button
              onClick={() => handleThemeChange('light')}
              className={mapStyle === 'light' ? 'btn-primary' : 'btn-secondary'}
              style={{ height: '22px', fontSize: '11px', padding: '0 7px' }}
            >
              Light
            </button>
            <button
              onClick={() => handleThemeChange('satellite')}
              className={
                mapStyle === 'satellite' ? 'btn-primary' : 'btn-secondary'
              }
              style={{ height: '22px', fontSize: '11px', padding: '0 7px' }}
            >
              Satellite
            </button>
            <button
              onClick={() => handleThemeChange('outdoors')}
              className={
                mapStyle === 'outdoors' ? 'btn-primary' : 'btn-secondary'
              }
              style={{ height: '22px', fontSize: '11px', padding: '0 7px' }}
            >
              Outdoors
            </button>
          </div>
        </div>

        {/* Action States: Save Drawn Polygon or Cancel Drawing (ONLY when NOT editing boundary) */}
        {!editingBoundarySite && (drawnGeoJSON || isDrawing) && (
          <div
            className="card-container animate-fade-in"
            style={{
              padding: '5px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
              border: '1px solid #E2E8F0',
              pointerEvents: 'auto',
            }}
          >
            {drawnGeoJSON && (
              <button
                onClick={onOpenSiteForm}
                className="btn-primary"
                style={{
                  backgroundColor: 'var(--color-emerald)',
                  borderColor: 'var(--color-emerald)',
                  height: '24px',
                  fontSize: '11px',
                  padding: '0 9px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 1px 3px rgba(5, 150, 105, 0.25)',
                }}
              >
                <CheckCircle2 size={13} />
                Save drawn polygon
              </button>
            )}

            <button
              onClick={handleClearDraw}
              className="btn-secondary"
              style={{
                height: '24px',
                fontSize: '11px',
                padding: '0 7px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#B91C1C',
              }}
              title={drawnGeoJSON ? 'Discard drawn polygon' : 'Cancel drawing'}
            >
              <Trash2 size={12} />
              Cancel
            </button>
          </div>
        )}

        {/* Active Boundary Editing HUD Controls */}
        {editingBoundarySite && (
          <div
            className="card-container animate-fade-in"
            style={{
              padding: '5px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.18)',
              border: '1px solid #A7F3D0',
              pointerEvents: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#065F46',
                backgroundColor: '#ECFDF5',
                padding: '2px 7px',
                borderRadius: '6px',
                maxWidth: '180px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  boxShadow: '0 0 6px #10B981',
                  flexShrink: 0,
                }}
              />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Editing: {editingBoundarySite.name}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSaveEditedBoundaryClick}
              disabled={isSavingBoundary}
              className="btn-primary"
              style={{
                backgroundColor: 'var(--color-emerald)',
                borderColor: 'var(--color-emerald)',
                height: '24px',
                fontSize: '11px',
                padding: '0 9px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 1px 3px rgba(5, 150, 105, 0.25)',
                cursor: isSavingBoundary ? 'not-allowed' : 'pointer',
                opacity: isSavingBoundary ? 0.75 : 1,
              }}
              title="Save updated polygon boundary"
            >
              {isSavingBoundary ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <CheckCircle2 size={13} />
              )}
              {isSavingBoundary ? 'Saving...' : 'Save updated boundary'}
            </button>

            <button
              onClick={onCancelEditBoundary}
              className="btn-secondary"
              style={{
                height: '24px',
                fontSize: '11px',
                padding: '0 7px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#B91C1C',
              }}
              title="Cancel boundary adjustment"
            >
              <Trash2 size={12} />
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Floating Boundary Editing Helper Banner */}
      {editingBoundarySite && (
        <div
          className="font-mono print:hidden"
          style={{
            position: 'absolute',
            top: '56px',
            left: '56px',
            padding: '6px 12px',
            fontSize: '11px',
            backgroundColor: '#064E3B',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 10,
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #059669',
            maxWidth: 'min(640px, calc(100% - 120px))',
          }}
        >
          <span style={{ color: '#86EFAC', fontWeight: 600, flexShrink: 0 }}>
            ● BOUNDARY EDITOR:
          </span>
          <span style={{ fontSize: '10.5px' }}>
            Drag white circular vertex handles to reshape boundary. Click
            midpoints to insert new vertices. Click "Save updated boundary" when
            finished.
          </span>
        </div>
      )}

      {/* Floating Drawing Mode Helper Banner */}
      {isDrawing && !drawnGeoJSON && (
        <div
          className="font-mono print:hidden"
          style={{
            position: 'absolute',
            top: '60px',
            left: '60px',
            padding: '8px 14px',
            fontSize: '11px',
            backgroundColor: '#131b2e',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 10,
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #2d3748',
          }}
        >
          <span style={{ color: '#85f8c4', fontWeight: 600 }}>
            ● DRAWING MODE:
          </span>
          <span>
            {clickCount === 0
              ? 'Click 1st point on map to start boundary'
              : clickCount === 1
                ? 'Click 2nd point to draw line segment'
                : clickCount === 2
                  ? 'Click 3rd point to form initial shaded triangle'
                  : `Captured ${clickCount} vertices — click to expand shape, or double-click to finish`}
          </span>
        </div>
      )}

      {/* Floating Bottom-Right Coordinate & Viewport HUD */}
      <div
        className="card-container font-mono print:hidden"
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
            {mouseCoords
              ? `${mouseCoords.lat}° N, ${mouseCoords.lng}° E`
              : 'Hover map...'}
          </span>
        </div>
        <span style={{ opacity: 0.4 }}>|</span>
        <span>EPSG:4326</span>
      </div>
    </div>
  );
};
