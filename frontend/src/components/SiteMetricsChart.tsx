import React from 'react';
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
}

export const SiteMetricsChart: React.FC<SiteMetricsChartProps> = ({
  metrics,
}) => {
  const ndviMetrics = metrics
    .filter((m) => m.metric_type === 'ndvi')
    .sort(
      (a, b) =>
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );

  const canopyMetrics = metrics
    .filter((m) => m.metric_type === 'canopy_cover')
    .sort(
      (a, b) =>
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );

  const labels = Array.from(
    new Set([
      ...ndviMetrics.map((m) =>
        new Date(m.recorded_at).toLocaleDateString(undefined, {
          month: 'short',
          year: '2-digit',
        })
      ),
      ...canopyMetrics.map((m) =>
        new Date(m.recorded_at).toLocaleDateString(undefined, {
          month: 'short',
          year: '2-digit',
        })
      ),
    ])
  );

  const data = {
    labels,
    datasets: [
      {
        label: 'Canopy cover (%)',
        data: canopyMetrics.map((m) => m.value),
        borderColor: '#2F5233',
        backgroundColor: '#2F5233',
        yAxisID: 'y1',
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: 'NDVI vegetation index',
        data: ndviMetrics.map((m) => m.value * 100), // Scale to % for visual alignment
        borderColor: '#7A9B76',
        backgroundColor: '#7A9B76',
        yAxisID: 'y1',
        borderDash: [4, 4],
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: {
            family: 'Inter',
            size: 11,
          },
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
            if (label.includes('NDVI')) {
              return `NDVI: ${(val / 100).toFixed(2)}`;
            }
            return `${label}: ${val}%`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: '#D8D3C4',
        },
        ticks: {
          font: {
            family: 'Inter',
            size: 10,
          },
          color: '#1C2B22',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        min: 0,
        max: 100,
        grid: {
          color: '#D8D3C4',
        },
        ticks: {
          font: {
            family: 'Inter',
            size: 10,
          },
          color: '#1C2B22',
          callback: (value) => `${value}%`,
        },
      },
    },
  };

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
        No vegetation metrics recorded yet for this site. Seed baseline data or
        run satellite ingestion.
      </div>
    );
  }

  return (
    <div style={{ height: '220px', width: '100%', position: 'relative' }}>
      <Line data={data} options={options} />
    </div>
  );
};
