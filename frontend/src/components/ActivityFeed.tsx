import React, { useEffect, useState } from 'react';
import { ActivityLogItem } from '../types';
import { api } from '../api';
import {
  Activity,
  Clock,
  User as UserIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
    return date.toLocaleDateString();
  } catch {
    return 'recently';
  }
}

export const ActivityFeed: React.FC = () => {
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    loadActivityFeed();
  }, []);

  const loadActivityFeed = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await api.activity.list(50);
      setActivities(data);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to retrieve recent activity log'
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div
      style={{
        padding: '24px',
        height: '100%',
        overflowY: 'auto',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      {/* Header Bar */}
      <div style={{ marginBottom: '24px' }}>
        <h1
          className="heading-serif"
          style={{ fontSize: '24px', color: 'var(--color-ink)' }}
        >
          System activity feed
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--color-ink)',
            opacity: 0.75,
            marginTop: '2px',
          }}
        >
          Real-time record of project initializations, site polygon edits, and
          metric ingestion
        </p>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="card-container"
              style={{
                padding: '16px',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <div
                className="skeleton-pulse"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  className="skeleton-pulse"
                  style={{
                    width: '60%',
                    height: '14px',
                    marginBottom: '8px',
                  }}
                />
                <div
                  className="skeleton-pulse"
                  style={{ width: '40%', height: '12px' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Voice-aligned Error State */}
      {errorMsg && !loading && (
        <div
          style={{
            padding: '16px',
            backgroundColor: 'rgba(181, 86, 60, 0.1)',
            border: '1px solid var(--color-clay)',
            color: 'var(--color-clay)',
            fontSize: '13px',
            marginBottom: '20px',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Voice-aligned Empty State */}
      {!loading && !errorMsg && activities.length === 0 && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-line)',
            padding: '48px 24px',
            textAlign: 'center',
          }}
        >
          <Activity
            size={32}
            color="var(--color-moss)"
            style={{ marginBottom: '12px' }}
          />
          <h3
            className="heading-serif"
            style={{
              fontSize: '18px',
              color: 'var(--color-ink)',
              marginBottom: '6px',
            }}
          >
            No recent activity logged yet
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--color-ink)',
              opacity: 0.7,
              maxWidth: '420px',
              margin: '0 auto',
            }}
          >
            Operations, polygon boundary captures, and conservation project
            updates will appear here in real time as administrators and analysts
            interact with the console.
          </p>
        </div>
      )}

      {/* Activity Timeline List */}
      {!loading && !errorMsg && activities.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activities.map((item) => {
            const isExpanded = expandedId === item.id;
            const hasDiff = item.diff && Object.keys(item.diff).length > 0;

            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-line)',
                  padding: '16px',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-bg)',
                        border: '1px solid var(--color-line)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      <UserIcon size={16} color="var(--color-canopy)" />
                    </div>

                    <div>
                      {/* Plain-language requirement formatted sentence */}
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '14px',
                          color: 'var(--color-ink)',
                          lineHeight: '1.4',
                        }}
                      >
                        {item.sentence}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginTop: '6px',
                          fontSize: '12px',
                          color: 'var(--color-ink)',
                          opacity: 0.7,
                        }}
                      >
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Clock size={12} />
                          {formatTimeAgo(item.created_at)}
                        </span>

                        <span
                          className="badge badge-neutral"
                          style={{ textTransform: 'lowercase' }}
                        >
                          {item.entity_type} {item.action}
                        </span>
                      </div>
                    </div>
                  </div>

                  {hasDiff && (
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="btn-secondary"
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        flexShrink: 0,
                      }}
                    >
                      {isExpanded ? (
                        <>
                          Hide diff <ChevronUp size={12} />
                        </>
                      ) : (
                        <>
                          Inspect payload <ChevronDown size={12} />
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Collapsible JSON diff inspector */}
                {isExpanded && hasDiff && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px',
                      backgroundColor: 'var(--color-bg)',
                      border: '1px solid var(--color-line)',
                      fontSize: '11px',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        marginBottom: '6px',
                        opacity: 0.8,
                      }}
                    >
                      Attribute change record
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        fontFamily: 'Inter, sans-serif',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: 'var(--color-ink)',
                      }}
                    >
                      {JSON.stringify(item.diff, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
