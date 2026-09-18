import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { SiteMetric } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SiteMetricsChartProps {
  metrics: SiteMetric[];
  height?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise an ISO date string to a yyyy-mm-dd key for deduplication. */
const isoToKey = (iso: string): string => iso.slice(0, 10);

/**
 * Format a yyyy-mm-dd key into a readable tick label.
 * For annual data (all Jan-01) we show just the year; otherwise month + year.
 */
const formatKey = (key: string, allJan: boolean): string => {
  const d = new Date(key + 'T00:00:00Z');
  if (isNaN(d.getTime())) return key;
  if (allJan) return String(d.getUTCFullYear());
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

/**
 * Build a chronologically-sorted array of unique date-keys from a set of
 * metric arrays. Returns the sorted ISO date-key strings (yyyy-mm-dd).
 */
const buildSortedKeys = (...metricGroups: SiteMetric[][]): string[] => {
  const seen = new Set<string>();
  for (const group of metricGroups) {
    for (const m of group) {
      seen.add(isoToKey(m.recorded_at));
    }
  }
  return Array.from(seen).sort(); // lexicographic sort works for yyyy-mm-dd
};

/**
 * Map a series of metrics onto a pre-computed sorted key array.
 * Entries whose date key is absent produce null (rendered as gap).
 */
const mapToAxis = (
  sortedKeys: string[],
  group: SiteMetric[],
  transform: (v: number) => number = (v) => v
): (number | null)[] => {
  const lookup = new Map<string, number>();
  for (const m of group) {
    lookup.set(isoToKey(m.recorded_at), transform(m.value));
  }
  return sortedKeys.map((k) => lookup.get(k) ?? null);
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SiteMetricsChart: React.FC<SiteMetricsChartProps> = ({
  metrics,
  height = '220px',
}) => {
  const hasVegetation = metrics.some(
    (m) => m.metric_type === 'ndvi' || m.metric_type === 'canopy_cover'
  );
  const hasDisturbance = metrics.some(
    (m) =>
      m.metric_type === 'deforestation_area_km2' ||
      m.metric_type === 'fire_incidents'
  );

  const [viewMode, setViewMode] = useState<'vegetation' | 'disturbance'>(
    hasVegetation ? 'vegetation' : hasDisturbance ? 'disturbance' : 'vegetation'
  );

  useEffect(() => {
    if (!hasVegetation && hasDisturbance) {
      setViewMode('disturbance');
    } else if (hasVegetation && !hasDisturbance) {
      setViewMode('vegetation');
    }
  }, [hasVegetation, hasDisturbance]);

  if (metrics.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          backgroundColor: 'var(--color-bg)',
          border: '1px solid var(--color-line)',
          fontSize: '12px',
          color: 'var(--color-ink)',
          opacity: 0.7,
        }}
      >
        No telemetry metrics recorded yet for this site. Seed baseline data or
        import a CSV time-series.
      </div>
    );
  }

  // Separate metric groups
  const ndviMetrics = metrics
    .filter((m) => m.metric_type === 'ndvi')
    .sort((a, b) =>
      isoToKey(a.recorded_at).localeCompare(isoToKey(b.recorded_at))
    );

  const canopyMetrics = metrics
    .filter((m) => m.metric_type === 'canopy_cover')
    .sort((a, b) =>
      isoToKey(a.recorded_at).localeCompare(isoToKey(b.recorded_at))
    );

  const deforestMetrics = metrics
    .filter((m) => m.metric_type === 'deforestation_area_km2')
    .sort((a, b) =>
      isoToKey(a.recorded_at).localeCompare(isoToKey(b.recorded_at))
    );

  const fireMetrics = metrics
    .filter((m) => m.metric_type === 'fire_incidents')
    .sort((a, b) =>
      isoToKey(a.recorded_at).localeCompare(isoToKey(b.recorded_at))
    );

  // --- Vegetation chart axis ---
  const vegKeys = buildSortedKeys(ndviMetrics, canopyMetrics);
  const vegAllJan = vegKeys.every((k) => k.slice(5, 10) === '01-01');
  const vegLabels = vegKeys.map((k) => formatKey(k, vegAllJan));

  const vegData = {
    labels: vegLabels,
    datasets: [
      {
        label: 'Canopy cover (%)',
        data: mapToAxis(vegKeys, canopyMetrics),
        borderColor: '#2F5233',
        backgroundColor: '#2F5233',
        yAxisID: 'y1',
        tension: 0.3,
        pointRadius: 3,
        spanGaps: true,
      },
      {
        label: 'NDVI vegetation index',
        data: mapToAxis(vegKeys, ndviMetrics, (v) => v * 100),
        borderColor: '#7A9B76',
        backgroundColor: '#7A9B76',
        yAxisID: 'y1',
        borderDash: [4, 4],
        tension: 0.3,
        pointRadius: 3,
        spanGaps: true,
      },
    ],
  };

  const vegOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { family: 'Inter', size: 11 },
          color: '#1C2B22',
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const val = context.parsed.y;
            if (val == null) return `${label}: N/A`;
            if (label.includes('NDVI'))
              return `NDVI: ${(val / 100).toFixed(2)}`;
            return `${label}: ${val}%`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#D8D3C4' },
        ticks: { font: { family: 'Inter', size: 10 }, color: '#1C2B22' },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        min: 0,
        max: 100,
        grid: { color: '#D8D3C4' },
        ticks: {
          font: { family: 'Inter', size: 10 },
          color: '#1C2B22',
          callback: (value) => `${value}%`,
        },
      },
    },
  };

  // --- Disturbance chart axis ---
  const distKeys = buildSortedKeys(deforestMetrics, fireMetrics);
  const distAllJan = distKeys.every((k) => k.slice(5, 10) === '01-01');
  const distLabels = distKeys.map((k) => formatKey(k, distAllJan));

  const distData = {
    labels: distLabels,
    datasets: [
      {
        label: 'Deforestation Area (km²)',
        data: mapToAxis(distKeys, deforestMetrics),
        borderColor: '#DC2626',
        backgroundColor: '#DC2626',
        yAxisID: 'yDeforest',
        tension: 0.25,
        pointRadius: 3,
        spanGaps: true,
      },
      {
        label: 'Fire Incidents',
        data: mapToAxis(distKeys, fireMetrics),
        borderColor: '#F59E0B',
        backgroundColor: '#F59E0B',
        yAxisID: 'yFires',
        borderDash: [4, 4],
        tension: 0.25,
        pointRadius: 3,
        spanGaps: true,
      },
    ],
  };

  const distOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { family: 'Inter', size: 11 },
          color: '#1C2B22',
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const val = context.parsed.y;
            if (val == null) return `${label}: N/A`;
            if (label.includes('Deforestation'))
              return `Deforestation: ${val.toLocaleString()} km²`;
            if (label.includes('Fire'))
              return `Fire Incidents: ${val.toLocaleString()}`;
            return `${label}: ${val}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#D8D3C4' },
        ticks: { font: { family: 'Inter', size: 10 }, color: '#1C2B22' },
      },
      yDeforest: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: { color: '#E2E8F0' },
        ticks: {
          font: { family: 'Inter', size: 10 },
          color: '#DC2626',
          callback: (value) => `${value} km²`,
        },
      },
      yFires: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        ticks: {
          font: { family: 'Inter', size: 10 },
          color: '#D97706',
          callback: (value) => `${value}`,
        },
      },
    },
  };

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {hasVegetation && hasDisturbance && (
        <div
          style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '8px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('vegetation')}
            style={{
              padding: '2px 8px',
              fontSize: '10px',
              borderRadius: '12px',
              border: '1px solid',
              borderColor:
                viewMode === 'vegetation'
                  ? 'var(--color-teal)'
                  : 'var(--color-line)',
              backgroundColor:
                viewMode === 'vegetation' ? '#EBF5F0' : 'transparent',
              color:
                viewMode === 'vegetation'
                  ? 'var(--color-teal)'
                  : 'var(--color-ink-muted)',
              fontWeight: viewMode === 'vegetation' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            Vegetation (NDVI / Canopy)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('disturbance')}
            style={{
              padding: '2px 8px',
              fontSize: '10px',
              borderRadius: '12px',
              border: '1px solid',
              borderColor:
                viewMode === 'disturbance' ? '#DC2626' : 'var(--color-line)',
              backgroundColor:
                viewMode === 'disturbance' ? '#FEF2F2' : 'transparent',
              color:
                viewMode === 'disturbance'
                  ? '#DC2626'
                  : 'var(--color-ink-muted)',
              fontWeight: viewMode === 'disturbance' ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            Disturbance (Deforestation / Fires)
          </button>
        </div>
      )}

      <div style={{ height, width: '100%', position: 'relative' }}>
        {viewMode === 'vegetation' ? (
          <Line data={vegData} options={vegOptions} />
        ) : (
          <Line data={distData} options={distOptions} />
        )}
      </div>
    </div>
  );
};
