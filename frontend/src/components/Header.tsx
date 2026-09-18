import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  MapPin,
  Compass,
  Folder,
  X,
  BarChart2,
  Activity,
  Globe,
  Navigation,
} from 'lucide-react';
import { Site, Project, UserRole } from '../types';

export interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  userRole?: UserRole;
  onOpenDrawMode: () => void;
  onCancelDraw?: () => void;
  isDrawing?: boolean;
  hasDrawnPolygon?: boolean;
  onOpenNewProject: () => void;
  activeTab: string;
  sites?: Site[];
  projects?: Project[];
  onSelectSite?: (site: Site) => void;
  onSelectProject?: (projectId: number) => void;
  onJumpToCoordinates?: (lat: number, lng: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  userRole,
  onOpenDrawMode,
  onCancelDraw,
  isDrawing,
  hasDrawnPolygon,
  onOpenNewProject,
  activeTab,
  sites = [],
  projects = [],
  onSelectSite,
  onSelectProject,
  onJumpToCoordinates,
}) => {
  const canModify = userRole === 'admin' || userRole === 'analyst';
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K / Cmd+K listener to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsDropdownOpen(true);
      } else if (e.key === 'Escape') {
        setIsDropdownOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Coordinate parser for lat, lng inputs
  const parseCoordinates = (
    text: string
  ): { lat: number; lng: number } | null => {
    const trimmed = text.trim();
    const parts = trimmed.split(/[\s,]+/).filter(Boolean);
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        return { lat, lng };
      }
    }
    return null;
  };

  const detectedCoords = parseCoordinates(searchQuery);

  const matchingSites = searchQuery.trim()
    ? sites
        .filter((s) => {
          const project = projects.find((p) => p.id === s.project_id);
          const projName = project?.name || '';
          const query = searchQuery.toLowerCase().trim();
          return (
            s.name.toLowerCase().includes(query) ||
            s.site_type.toLowerCase().includes(query) ||
            projName.toLowerCase().includes(query)
          );
        })
        .slice(0, 5)
    : [];

  const matchingProjects = searchQuery.trim()
    ? projects
        .filter(
          (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.description &&
              p.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .slice(0, 4)
    : [];

  const hasResults =
    Boolean(detectedCoords) ||
    matchingSites.length > 0 ||
    matchingProjects.length > 0;

  const getTabDetails = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return { label: 'Executive Dashboard', icon: BarChart2 };
      case 'map':
        return { label: 'Planetary GIS Map', icon: MapPin };
      case 'projects':
        return { label: 'Projects Directory', icon: Folder };
      case 'feed':
        return { label: 'Audit & Telemetry Log', icon: Activity };
      default:
        return { label: 'Planetary Ops', icon: Globe };
    }
  };

  const currentTabInfo = getTabDetails(activeTab);
  const TabIcon = currentTabInfo.icon;

  return (
    <header
      style={{
        height: '52px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 40,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Left: Active Tab Badge & Omni-Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flex: 1,
          maxWidth: '620px',
        }}
      >
        {/* Workspace Context Capsule */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#334155',
            backgroundColor: '#F1F5F9',
            padding: '5px 10px',
            borderRadius: '6px',
            border: '1px solid #E2E8F0',
            whiteSpace: 'nowrap',
            letterSpacing: '0.02em',
          }}
          title={`Active View: ${currentTabInfo.label}`}
        >
          <TabIcon size={13} color="#059669" />
          <span>{currentTabInfo.label}</span>
        </div>

        {/* Global Omni-Search Input */}
        <div
          ref={searchContainerRef}
          style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={14}
              color={isFocused ? '#059669' : '#94A3B8'}
              style={{
                position: 'absolute',
                left: '11px',
                pointerEvents: 'none',
                transition: 'color 0.15s ease',
              }}
            />
            <input
              ref={inputRef}
              type="text"
              className="input-field"
              placeholder="Search projects, sites, coordinates (lat, lng)..."
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => {
                setIsFocused(true);
                if (searchQuery.trim()) {
                  setIsDropdownOpen(true);
                }
              }}
              onBlur={() => setIsFocused(false)}
              style={{
                paddingLeft: '34px',
                paddingRight: searchQuery ? '62px' : '52px',
                fontSize: '12px',
                height: '34px',
                backgroundColor: isFocused ? '#FFFFFF' : '#F8FAFC',
                borderColor: isFocused ? '#059669' : '#E2E8F0',
                borderRadius: '8px',
                boxShadow: isFocused
                  ? '0 0 0 3px rgba(5, 150, 105, 0.12)'
                  : 'none',
                transition: 'all 0.15s ease',
              }}
            />

            {/* Clear Button & Shortcut Badge */}
            <div
              style={{
                position: 'absolute',
                right: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    setIsDropdownOpen(false);
                    inputRef.current?.focus();
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '2px',
                    cursor: 'pointer',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                  }}
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
              <kbd
                style={{
                  fontSize: '9px',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  padding: '2px 5px',
                  borderRadius: '4px',
                  backgroundColor: '#E2E8F0',
                  color: '#64748B',
                  border: '1px solid #CBD5E1',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              >
                Ctrl K
              </kbd>
            </div>
          </div>

          {/* Autocomplete / Command Palette Dropdown */}
          {isDropdownOpen && searchQuery.trim().length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '6px',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                boxShadow:
                  '0 12px 28px -4px rgba(15, 23, 42, 0.16), 0 4px 10px -2px rgba(15, 23, 42, 0.08)',
                border: '1px solid #E2E8F0',
                zIndex: 100,
                maxHeight: '380px',
                overflowY: 'auto',
              }}
            >
              {/* Jump to Coordinates Option */}
              {detectedCoords && (
                <div style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <div
                    style={{
                      padding: '6px 12px',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      color: '#64748B',
                      textTransform: 'uppercase',
                      backgroundColor: '#F8FAFC',
                    }}
                  >
                    Coordinates Detected
                  </div>
                  <div
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onJumpToCoordinates?.(
                        detectedCoords.lat,
                        detectedCoords.lng
                      );
                    }}
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      backgroundColor: '#F0FDF4',
                      borderLeft: '3px solid #059669',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = '#DCFCE7')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = '#F0FDF4')
                    }
                  >
                    <Compass size={16} color="#059669" />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#065F46',
                        }}
                      >
                        Teleport to Map Coordinates
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#047857',
                          fontFamily: 'monospace',
                        }}
                      >
                        {detectedCoords.lat.toFixed(5)},{' '}
                        {detectedCoords.lng.toFixed(5)}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        backgroundColor: '#059669',
                        color: '#FFFFFF',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                      }}
                    >
                      Jump
                    </span>
                  </div>
                </div>
              )}

              {/* Matching Sites */}
              {matchingSites.length > 0 && (
                <div style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <div
                    style={{
                      padding: '6px 12px',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      color: '#64748B',
                      textTransform: 'uppercase',
                      backgroundColor: '#F8FAFC',
                    }}
                  >
                    Conservation Sites ({matchingSites.length})
                  </div>
                  {matchingSites.map((site) => (
                    <div
                      key={site.id}
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onSelectSite?.(site);
                      }}
                      style={{
                        padding: '8px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = '#F8FAFC')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = 'transparent')
                      }
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <MapPin size={14} color="#059669" />
                        <div>
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#1E293B',
                            }}
                          >
                            {site.name}
                          </div>
                          <div
                            style={{
                              fontSize: '10px',
                              color: '#64748B',
                              textTransform: 'capitalize',
                            }}
                          >
                            {site.site_type.replace('_', ' ')} •{' '}
                            {(site.area_hectares || 0).toFixed(1)} ha
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#059669',
                          fontWeight: 500,
                        }}
                      >
                        Inspect →
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Matching Projects */}
              {matchingProjects.length > 0 && (
                <div>
                  <div
                    style={{
                      padding: '6px 12px',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      color: '#64748B',
                      textTransform: 'uppercase',
                      backgroundColor: '#F8FAFC',
                    }}
                  >
                    Conservation Projects ({matchingProjects.length})
                  </div>
                  {matchingProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onSearchChange(project.name);
                        onSelectProject?.(project.id);
                      }}
                      style={{
                        padding: '8px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = '#F8FAFC')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = 'transparent')
                      }
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <Folder size={14} color="#3B82F6" />
                        <div>
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#1E293B',
                            }}
                          >
                            {project.name}
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748B' }}>
                            {project.site_count || 0} sites registered
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#2563EB',
                          fontWeight: 500,
                        }}
                      >
                        View Project →
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* No results */}
              {!hasResults && (
                <div
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#94A3B8',
                  }}
                >
                  No matching sites or projects found for "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Telemetry Cockpit & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Radar Telemetry Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            color: '#334155',
            backgroundColor: '#F8FAFC',
            padding: '5px 12px',
            borderRadius: '6px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
          }}
          title="Telemetry Link: Active PostGIS connection, Sentinel-2 feeds online"
        >
          {/* Radar Pulsing Indicator */}
          <div
            style={{
              position: 'relative',
              width: '8px',
              height: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: '#10B981',
                opacity: 0.6,
                animation: 'ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
              }}
            />
            <span
              style={{
                position: 'relative',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#059669',
                boxShadow: '0 0 6px rgba(5, 150, 105, 0.6)',
              }}
            />
          </div>

          <span style={{ fontWeight: 600, color: '#0F172A' }}>
            Telemetry Live
          </span>
          <span style={{ color: '#CBD5E1' }}>|</span>
          <span
            className="font-mono"
            style={{ fontSize: '10px', color: '#059669', fontWeight: 600 }}
          >
            16ms
          </span>
        </div>

        {/* Global Action Buttons */}
        {canModify && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={
                isDrawing || hasDrawnPolygon ? onCancelDraw : onOpenDrawMode
              }
              className={
                isDrawing || hasDrawnPolygon ? 'btn-secondary' : 'btn-canopy'
              }
              style={{
                height: '34px',
                fontSize: '12px',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '6px',
                fontWeight: 600,
                color: isDrawing || hasDrawnPolygon ? '#DC2626' : undefined,
                borderColor:
                  isDrawing || hasDrawnPolygon ? '#FCA5A5' : undefined,
                backgroundColor:
                  isDrawing || hasDrawnPolygon ? '#FEF2F2' : undefined,
                boxShadow:
                  isDrawing || hasDrawnPolygon
                    ? '0 1px 2px rgba(220, 38, 38, 0.1)'
                    : '0 1px 2px rgba(5, 150, 105, 0.2)',
              }}
              title={
                isDrawing || hasDrawnPolygon
                  ? 'Cancel polygon drawing & clear map'
                  : 'Activate GIS Polygon Drawing on Map'
              }
            >
              {isDrawing || hasDrawnPolygon ? (
                <>
                  <X size={14} color="#DC2626" />
                  <span>Cancel Drawing</span>
                </>
              ) : (
                <>
                  <Navigation
                    size={13}
                    style={{ transform: 'rotate(45deg)' }}
                  />
                  <span>Draw Site</span>
                </>
              )}
            </button>

            <button
              onClick={onOpenNewProject}
              className="btn-secondary"
              style={{
                height: '34px',
                fontSize: '12px',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '6px',
                fontWeight: 600,
                borderColor: '#CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#1E293B',
              }}
              title="Create a new conservation project portfolio"
            >
              <Plus size={14} color="#059669" />
              <span>New Project</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
