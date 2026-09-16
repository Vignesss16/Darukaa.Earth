import React from 'react';
import { Layers, Map, LogOut, Shield, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentTab: 'map' | 'projects';
  onTabChange: (tab: 'map' | 'projects') => void;
  currentUser: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  currentUser,
  onLogout,
}) => {
  return (
    <aside
      style={{
        width: '220px',
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid var(--color-line)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      <div>
        {/* Brand Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-line)',
          }}
        >
          <div
            className="heading-serif"
            style={{
              fontSize: '18px',
              color: 'var(--color-canopy)',
              fontWeight: 700,
            }}
          >
            Darukaa.Earth
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--color-ink)',
              opacity: 0.7,
              marginTop: '2px',
            }}
          >
            Conservation ops console
          </div>
        </div>

        {/* Navigation Items - Sentence Case */}
        <nav style={{ padding: '16px 12px' }}>
          <button
            onClick={() => onTabChange('map')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              border: 'none',
              backgroundColor:
                currentTab === 'map' ? 'rgba(47, 82, 51, 0.08)' : 'transparent',
              color:
                currentTab === 'map'
                  ? 'var(--color-canopy)'
                  : 'var(--color-ink)',
              fontWeight: currentTab === 'map' ? 600 : 400,
              cursor: 'pointer',
              marginBottom: '4px',
              textAlign: 'left',
            }}
          >
            <Map
              size={18}
              color={
                currentTab === 'map'
                  ? 'var(--color-canopy)'
                  : 'var(--color-ink)'
              }
            />
            Sites map
          </button>

          <button
            onClick={() => onTabChange('projects')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              border: 'none',
              backgroundColor:
                currentTab === 'projects'
                  ? 'rgba(47, 82, 51, 0.08)'
                  : 'transparent',
              color:
                currentTab === 'projects'
                  ? 'var(--color-canopy)'
                  : 'var(--color-ink)',
              fontWeight: currentTab === 'projects' ? 600 : 400,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Layers
              size={18}
              color={
                currentTab === 'projects'
                  ? 'var(--color-canopy)'
                  : 'var(--color-ink)'
              }
            />
            Projects index
          </button>
        </nav>
      </div>

      {/* User Footer */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid var(--color-line)',
          backgroundColor: 'var(--color-bg)',
        }}
      >
        {currentUser ? (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              <UserIcon size={16} color="var(--color-canopy)" />
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                  }}
                >
                  {currentUser.full_name}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-ink)',
                    opacity: 0.7,
                  }}
                >
                  {currentUser.email}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '10px',
              }}
            >
              <span
                className="badge badge-moss"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Shield size={10} />
                {currentUser.role}
              </span>
              <button
                onClick={onLogout}
                className="btn-secondary"
                style={{ padding: '4px 8px', fontSize: '11px' }}
                title="Sign out"
              >
                <LogOut size={12} />
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--color-ink)',
              opacity: 0.7,
            }}
          >
            Not signed in
          </div>
        )}
      </div>
    </aside>
  );
};
