import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Map,
  LogOut,
  Shield,
  User as UserIcon,
  Activity,
  Globe,
} from 'lucide-react';
import { User } from '../types';

export type NavTab = 'dashboard' | 'map' | 'projects' | 'activity';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
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
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                backgroundColor: 'var(--color-ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}
            >
              <Globe size={14} />
            </div>
            <div>
              <div
                className="heading-serif"
                style={{
                  fontSize: '16px',
                  color: 'var(--color-ink)',
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                Darukaa.Earth
              </div>
              <div
                className="font-mono"
                style={{
                  fontSize: '10px',
                  color: 'var(--color-ink-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Planetary Ops v2.4
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ padding: '12px 8px' }}>
          <button
            onClick={() => onTabChange('dashboard')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor:
                currentTab === 'dashboard' ? '#F1F5F9' : 'transparent',
              color:
                currentTab === 'dashboard'
                  ? 'var(--color-ink)'
                  : 'var(--color-ink-muted)',
              fontWeight: currentTab === 'dashboard' ? 600 : 400,
              cursor: 'pointer',
              marginBottom: '2px',
              textAlign: 'left',
              fontSize: '13px',
              transition: 'all 0.12s ease',
            }}
          >
            <LayoutDashboard
              size={16}
              color={
                currentTab === 'dashboard'
                  ? 'var(--color-ink)'
                  : 'var(--color-ink-muted)'
              }
            />
            Dashboard
          </button>

          <button
            onClick={() => onTabChange('map')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor:
                currentTab === 'map' ? '#F1F5F9' : 'transparent',
              color:
                currentTab === 'map'
                  ? 'var(--color-ink)'
                  : 'var(--color-ink-muted)',
              fontWeight: currentTab === 'map' ? 600 : 400,
              cursor: 'pointer',
              marginBottom: '2px',
              textAlign: 'left',
              fontSize: '13px',
              transition: 'all 0.12s ease',
            }}
          >
            <Map
              size={16}
              color={
                currentTab === 'map'
                  ? 'var(--color-ink)'
                  : 'var(--color-ink-muted)'
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
              padding: '8px 12px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor:
                currentTab === 'projects' ? '#F1F5F9' : 'transparent',
              color:
                currentTab === 'projects'
                  ? 'var(--color-ink)'
                  : 'var(--color-ink-muted)',
              fontWeight: currentTab === 'projects' ? 600 : 400,
              cursor: 'pointer',
              marginBottom: '2px',
              textAlign: 'left',
              fontSize: '13px',
              transition: 'all 0.12s ease',
            }}
          >
            <Layers
              size={16}
              color={
                currentTab === 'projects'
                  ? 'var(--color-ink)'
                  : 'var(--color-ink-muted)'
              }
            />
            Projects index
          </button>

          <button
            onClick={() => onTabChange('activity')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor:
                currentTab === 'activity' ? '#F1F5F9' : 'transparent',
              color:
                currentTab === 'activity'
                  ? 'var(--color-ink)'
                  : 'var(--color-ink-muted)',
              fontWeight: currentTab === 'activity' ? 600 : 400,
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '13px',
              transition: 'all 0.12s ease',
            }}
          >
            <Activity
              size={16}
              color={
                currentTab === 'activity'
                  ? 'var(--color-ink)'
                  : 'var(--color-ink-muted)'
              }
            />
            Activity feed
          </button>
        </nav>
      </div>

      {/* User Footer */}
      <div
        style={{
          padding: '14px 16px',
          borderTop: '1px solid var(--color-line)',
          backgroundColor: '#FAFAFA',
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
              <UserIcon size={16} color="var(--color-ink-muted)" />
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: '12px',
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
                    color: 'var(--color-ink-muted)',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
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
              <span className="badge badge-emerald">
                <Shield size={10} />
                {currentUser.role}
              </span>
              <button
                onClick={onLogout}
                className="btn-secondary"
                style={{ padding: '0 8px', height: '24px', fontSize: '11px' }}
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
              color: 'var(--color-ink-muted)',
            }}
          >
            Not signed in
          </div>
        )}
      </div>
    </aside>
  );
};

