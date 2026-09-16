import React from 'react';
import { DegradationAlert } from '../types';
import { AlertTriangle } from 'lucide-react';

interface AlertBannerProps {
  alerts: DegradationAlert[];
  onSelectSiteAlert?: (siteId: number) => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  alerts,
  onSelectSiteAlert,
}) => {
  if (alerts.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '16px',
      }}
    >
      {alerts.map((alert, idx) => (
        <div
          key={`${alert.site_id}-${alert.metric_type}-${idx}`}
          onClick={() => onSelectSiteAlert && onSelectSiteAlert(alert.site_id)}
          style={{
            backgroundColor: 'rgba(181, 86, 60, 0.1)',
            border: '1px solid var(--color-clay)',
            color: 'var(--color-clay)',
            padding: '10px 14px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            cursor: onSelectSiteAlert ? 'pointer' : 'default',
          }}
        >
          <AlertTriangle
            size={16}
            style={{ flexShrink: 0, marginTop: '1px' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: '2px' }}>
              Vegetation degradation alert
            </div>
            <div>{alert.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
