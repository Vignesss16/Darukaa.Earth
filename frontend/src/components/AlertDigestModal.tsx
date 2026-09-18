import React from 'react';
import { DegradationAlert, Site } from '../types';
import {
  X,
  Mail,
  ShieldCheck,
  ArrowDownRight,
  ShieldAlert,
} from 'lucide-react';

interface AlertDigestModalProps {
  site: Site | null;
  alerts: DegradationAlert[];
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export const AlertDigestModal: React.FC<AlertDigestModalProps> = ({
  site,
  alerts,
  isOpen,
  onClose,
  userEmail = 'analyst@darukaa.earth',
}) => {
  if (!isOpen || !site) return null;

  const subjectLine = `[Darukaa Degradation Notice] Critical Canopy Telemetry Alert: ${site.name}`;
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflow: 'hidden',
      }}
      className="print:hidden"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          color: '#0F172A',
          width: '100%',
          maxWidth: '640px',
          maxHeight: 'min(88vh, 680px)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          border: '1px solid #CBD5E1',
          overflow: 'hidden',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`
          @keyframes modalSlideUp {
            from { opacity: 0; transform: translateY(16px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
        {/* Email App Header Chrome */}
        <div
          style={{
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #334155',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '9999px',
                  backgroundColor: '#EF4444',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '9999px',
                  backgroundColor: '#F59E0B',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '9999px',
                  backgroundColor: '#10B981',
                  display: 'inline-block',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={16} color="#34D399" />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  letterSpacing: '-0.01em',
                }}
              >
                Automated Email Alert Digest
              </span>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#6EE7B7',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                LIVE PREVIEW
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '4px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Email Header Metadata */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            padding: '12px 20px',
            borderBottom: '1px solid #E2E8F0',
            fontSize: '11.5px',
            lineHeight: 1.5,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', marginBottom: '4px' }}>
            <span
              style={{
                width: '65px',
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                fontSize: '9.5px',
              }}
            >
              From:
            </span>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>
              Darukaa Telemetry Engine &lt;alerts@darukaa.earth&gt;
            </span>
          </div>
          <div style={{ display: 'flex', marginBottom: '4px' }}>
            <span
              style={{
                width: '65px',
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                fontSize: '9.5px',
              }}
            >
              To:
            </span>
            <span
              style={{
                backgroundColor: '#E2E8F0',
                padding: '1px 7px',
                borderRadius: '4px',
                fontWeight: 600,
                color: '#334155',
                fontFamily: 'monospace',
                fontSize: '11px',
              }}
            >
              {userEmail}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              paddingTop: '4px',
              borderTop: '1px solid #E2E8F0',
            }}
          >
            <span
              style={{
                width: '65px',
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                fontSize: '9.5px',
              }}
            >
              Subject:
            </span>
            <span
              style={{ fontWeight: 700, color: '#0F172A', fontSize: '12px' }}
            >
              {subjectLine}
            </span>
          </div>
        </div>

        {/* Email Body */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#FFFFFF',
            flex: 1,
            overflowY: 'auto',
          }}
        >
          {/* Site Overview Banner */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              boxShadow:
                '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#64748B',
                    fontWeight: 500,
                  }}
                >
                  Monitored Conservation Site
                </span>
                <h4
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0F172A',
                    margin: '2px 0 0 0',
                  }}
                >
                  {site.name}
                </h4>
              </div>
              <span
                style={{
                  backgroundColor: '#ECFDF5',
                  color: '#047857',
                  border: '1px solid #A7F3D0',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {site.site_type}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #E2E8F0',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '10px',
                    color: '#64748B',
                    display: 'block',
                    textTransform: 'uppercase',
                  }}
                >
                  Surface Area
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#0F172A',
                    fontFamily: 'monospace',
                  }}
                >
                  {site.area_hectares != null
                    ? `${site.area_hectares.toFixed(2)} ha`
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontSize: '10px',
                    color: '#64748B',
                    display: 'block',
                    textTransform: 'uppercase',
                  }}
                >
                  Degradation Events
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: alerts.length > 0 ? '#DC2626' : '#059669',
                    fontFamily: 'monospace',
                  }}
                >
                  {alerts.length} Detected
                </span>
              </div>
              <div>
                <span
                  style={{
                    fontSize: '10px',
                    color: '#64748B',
                    display: 'block',
                    textTransform: 'uppercase',
                  }}
                >
                  Report Date
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                  }}
                >
                  {currentDate}
                </span>
              </div>
            </div>
          </div>

          {/* Active Alerts List */}
          {alerts.length > 0 ? (
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                }}
              >
                <ShieldAlert size={16} color="#DC2626" />
                <h4
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#991B1B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: 0,
                  }}
                >
                  Active Degradation Anomaly Logs ({alerts.length})
                </h4>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'linear-gradient(to right, #FEF2F2, #FFF5F5)',
                      border: '1px solid #FECACA',
                      borderLeft: '4px solid #DC2626',
                      borderRadius: '12px',
                      padding: '18px',
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.05)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#991B1B',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        <ArrowDownRight size={18} color="#DC2626" />
                        {alert.metric_type.toUpperCase().replace('_', ' ')} DROP
                        DETECTED
                      </span>
                      <span
                        style={{
                          background:
                            'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
                          color: '#991B1B',
                          border: '1px solid #FCA5A5',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          boxShadow: '0 2px 4px rgba(220, 38, 38, 0.1)',
                        }}
                      >
                        -{alert.drop_percentage.toFixed(1)}%
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: '13px',
                        color: '#7F1D1D',
                        lineHeight: 1.6,
                        margin: '0 0 14px 0',
                        fontWeight: 500,
                      }}
                    >
                      {alert.message}
                    </p>

                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #FEE2E2',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            color: '#64748B',
                            display: 'block',
                            fontSize: '10px',
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                          }}
                        >
                          BASELINE ({alert.previous_date}):
                        </span>
                        <strong style={{ color: '#0F172A', fontSize: '14px' }}>
                          {alert.previous_value}
                        </strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            color: '#64748B',
                            display: 'block',
                            fontSize: '10px',
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                          }}
                        >
                          OBSERVED ({alert.recorded_at}):
                        </span>
                        <strong style={{ color: '#DC2626', fontSize: '14px' }}>
                          {alert.current_value}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <ShieldCheck size={24} color="#059669" />
              <div>
                <strong style={{ color: '#065F46', fontSize: '13px' }}>
                  Vegetation Baseline Healthy
                </strong>
                <p
                  style={{
                    color: '#047857',
                    fontSize: '12px',
                    margin: '2px 0 0 0',
                  }}
                >
                  No canopy cover or NDVI vegetation drops detected. Ecosystem
                  telemetry operates within normal baseline bounds.
                </p>
              </div>
            </div>
          )}

          <p
            style={{
              fontSize: '11px',
              color: '#64748B',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            This email digest was automatically generated by Darukaa.Earth
            Planetary Ops Engine. Log in to the console to initiate field team
            verification.
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            padding: '12px 20px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
            Darukaa.Earth Automated Monitoring Digest
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close Digest
          </button>
        </div>
      </div>
    </div>
  );
};
