import React from 'react';
import { Search, Plus, MapPin } from 'lucide-react';
import { UserRole } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  userRole?: UserRole;
  onOpenDrawMode: () => void;
  onOpenNewProject: () => void;
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  userRole,
  onOpenDrawMode,
  onOpenNewProject,
}) => {
  const canModify = userRole === 'admin' || userRole === 'analyst';

  return (
    <header
      style={{
        height: '48px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--color-line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 9,
        flexShrink: 0,
      }}
    >
      {/* Search Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: '420px' }}>
        <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
          <Search
            size={14}
            color="var(--color-ink-muted)"
            style={{ position: 'absolute', left: '10px', pointerEvents: 'none' }}
          />
          <input
            type="text"
            className="input-field"
            placeholder="Filter projects, sites, coordinates..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              paddingLeft: '30px',
              fontSize: '12px',
              height: '30px',
              backgroundColor: '#F8FAFC',
              borderColor: 'var(--color-line)',
            }}
          />
        </div>
      </div>

      {/* Center & Right Telemetry & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Telemetry Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            color: 'var(--color-ink-muted)',
            backgroundColor: '#F8FAFC',
            padding: '4px 10px',
            borderRadius: '4px',
            border: '1px solid var(--color-line)',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-emerald)',
              boxShadow: '0 0 6px rgba(5, 150, 105, 0.6)',
            }}
          />
          <span style={{ fontWeight: 500, color: 'var(--color-ink)' }}>Telemetry Live</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span className="font-mono" style={{ fontSize: '10px' }}>
            18ms latency
          </span>
        </div>

        {/* Quick Action Buttons */}
        {canModify && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onOpenDrawMode}
              className="btn-canopy"
              style={{ height: '30px', fontSize: '12px', padding: '0 10px' }}
              title="Draw polygon site on map"
            >
              <MapPin size={13} />
              Draw Site
            </button>
            <button
              onClick={onOpenNewProject}
              className="btn-secondary"
              style={{ height: '30px', fontSize: '12px', padding: '0 10px' }}
              title="Create new project container"
            >
              <Plus size={13} />
              New Project
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
