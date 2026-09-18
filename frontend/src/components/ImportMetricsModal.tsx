import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Database,
  Table,
} from 'lucide-react';
import { Site, MetricType } from '../types';
import { api } from '../api';

interface ImportMetricsModalProps {
  site: Site | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedCount: number) => void;
}

const VALID_METRIC_TYPES: Array<{ value: MetricType; label: string }> = [
  { value: 'ndvi', label: 'NDVI (Normalized Difference Veg. Index)' },
  { value: 'canopy_cover', label: 'Canopy Cover (%)' },
  { value: 'carbon_tons', label: 'Carbon Stock (Tons)' },
  { value: 'biodiversity_index', label: 'Biodiversity Index' },
  { value: 'deforestation_area_km2', label: 'Deforestation Area (km²)' },
  { value: 'fire_incidents', label: 'Fire Incidents (count)' },
];

function normalizeMetricType(raw: string): MetricType | null {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const match = VALID_METRIC_TYPES.find(
    (m) =>
      m.value === cleaned ||
      m.value.replace(/_/g, '') === cleaned.replace(/_/g, '')
  );
  if (match) return match.value;

  // Common aliases
  if (cleaned.includes('deforest')) return 'deforestation_area_km2';
  if (
    cleaned.includes('fire') ||
    cleaned.includes('fogo') ||
    cleaned.includes('queimada')
  )
    return 'fire_incidents';
  if (cleaned === 'canopy' || cleaned.includes('canopy_pct'))
    return 'canopy_cover';
  if (cleaned === 'carbon' || cleaned.includes('biomass')) return 'carbon_tons';
  if (cleaned === 'bio' || cleaned.includes('biodiv'))
    return 'biodiversity_index';
  if (cleaned === 'ndvi') return 'ndvi';

  return null;
}

function parseDateValue(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // Single 4-digit year e.g. "2018"
  if (/^\d{4}$/.test(s)) {
    return `${s}-01-01`;
  }

  // YYYY-MM or YYYY/MM
  if (/^\d{4}[-/]\d{1,2}$/.test(s)) {
    const parts = s.split(/[-/]/);
    const m = parts[1].padStart(2, '0');
    return `${parts[0]}-${m}-01`;
  }

  // Standard YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) {
    const parts = s.split(/[-/]/);
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${parts[0]}-${m}-${d}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(s)) {
    const parts = s.split(/[-/]/);
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    return `${parts[2]}-${m}-${d}`;
  }

  // Native Date parsing fallback
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

// Robust CSV row splitter that handles quoted commas
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export const ImportMetricsModal: React.FC<ImportMetricsModalProps> = ({
  site,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  // Column mapping states
  const [metricTypeMode, setMetricTypeMode] = useState<'column' | 'fixed'>(
    'fixed'
  );
  const [metricTypeColumn, setMetricTypeColumn] = useState<string>('');
  const [fixedMetricType, setFixedMetricType] = useState<MetricType>(
    'deforestation_area_km2'
  );
  const [valueColumn, setValueColumn] = useState<string>('');
  const [dateColumn, setDateColumn] = useState<string>('');
  const [sourceColumn, setSourceColumn] = useState<string>('');
  const [defaultSource, setDefaultSource] = useState<string>('csv_import');

  const [importing, setImporting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Reset local state when modal closes or active site changes
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setHeaders([]);
      setRawRows([]);
      setParseError(null);
      setApiError(null);
      setValueColumn('');
      setDateColumn('');
      setSourceColumn('');
      setMetricTypeColumn('');
    }
  }, [isOpen, site?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setParseError(null);
    setApiError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = (event.target?.result as string) || '';
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lines.length < 2) {
          setParseError(
            'CSV must contain a header row and at least one data row.'
          );
          return;
        }

        const parsedHeaders = parseCsvLine(lines[0]);
        const parsedRows = lines.slice(1).map((l) => parseCsvLine(l));

        setHeaders(parsedHeaders);
        setRawRows(parsedRows);

        // Auto-guess columns if obvious
        const lowerHeaders = parsedHeaders.map((h) => h.toLowerCase());

        // Value col
        const valIdx = lowerHeaders.findIndex((h) =>
          /value|val|reading|metric|score|amount|km2|firespots|count/i.test(h)
        );
        if (valIdx !== -1) setValueColumn(parsedHeaders[valIdx]);
        else if (parsedHeaders.length > 1) setValueColumn(parsedHeaders[1]);

        // Date col
        const dateIdx = lowerHeaders.findIndex((h) =>
          /date|year|recorded|time|ano|timestamp/i.test(h)
        );
        if (dateIdx !== -1) setDateColumn(parsedHeaders[dateIdx]);
        else setDateColumn(parsedHeaders[0]);

        // Metric type col
        const typeIdx = lowerHeaders.findIndex((h) =>
          /type|metric_type|indicator|variable/i.test(h)
        );
        if (typeIdx !== -1) {
          setMetricTypeMode('column');
          setMetricTypeColumn(parsedHeaders[typeIdx]);
        } else {
          setMetricTypeMode('fixed');
        }

        // Source col
        const srcIdx = lowerHeaders.findIndex((h) =>
          /source|sensor|provider|fonte/i.test(h)
        );
        if (srcIdx !== -1) setSourceColumn(parsedHeaders[srcIdx]);
      } catch (err: unknown) {
        setParseError(
          `Failed to parse CSV: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    };
    reader.readAsText(selected);
  };

  // Perform validation on all rows based on current mapping
  const { validRecords, invalidRowErrors } = useMemo(() => {
    if (
      !isOpen ||
      !site ||
      !headers.length ||
      !rawRows.length ||
      !valueColumn ||
      !dateColumn
    ) {
      return { validRecords: [], invalidRowErrors: [] };
    }

    const valIdx = headers.indexOf(valueColumn);
    const dateIdx = headers.indexOf(dateColumn);
    const typeIdx =
      metricTypeMode === 'column' ? headers.indexOf(metricTypeColumn) : -1;
    const srcIdx = sourceColumn ? headers.indexOf(sourceColumn) : -1;

    const valid: Array<{
      metric_type: MetricType;
      value: number;
      recorded_at: string;
      source: string;
      originalRow: number;
    }> = [];
    const errors: Array<{ rowNumber: number; reason: string }> = [];

    rawRows.forEach((row, i) => {
      const rowNumber = i + 2; // +1 for 1-based index, +1 for header line

      // 1. Metric Type
      let mType: MetricType | null = null;
      if (metricTypeMode === 'fixed') {
        mType = fixedMetricType;
      } else {
        const rawType = row[typeIdx] || '';
        mType = normalizeMetricType(rawType);
        if (!mType) {
          errors.push({
            rowNumber,
            reason: `'${rawType}' is not a recognized metric type`,
          });
          return;
        }
      }

      // 2. Value
      const rawVal = row[valIdx];
      const parsedVal = parseFloat(rawVal?.replace(/,/g, '') || '');
      if (isNaN(parsedVal)) {
        errors.push({
          rowNumber,
          reason: `Value '${rawVal}' is not a valid number`,
        });
        return;
      }

      // 3. Date
      const rawDate = row[dateIdx] || '';
      const parsedDate = parseDateValue(rawDate);
      if (!parsedDate) {
        errors.push({
          rowNumber,
          reason: `Date '${rawDate}' is not in a valid format`,
        });
        return;
      }

      // 4. Source
      const finalSource =
        (srcIdx !== -1 && row[srcIdx] ? row[srcIdx] : defaultSource).trim() ||
        'csv_import';

      valid.push({
        metric_type: mType,
        value: parsedVal,
        recorded_at: parsedDate,
        source: finalSource,
        originalRow: rowNumber,
      });
    });

    return { validRecords: valid, invalidRowErrors: errors };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    headers,
    rawRows,
    valueColumn,
    dateColumn,
    metricTypeMode,
    metricTypeColumn,
    fixedMetricType,
    sourceColumn,
    defaultSource,
    isOpen,
    site?.id,
  ]);

  const handleCommitImport = async () => {
    if (!validRecords.length || !site || importing) return;
    setImporting(true);
    setApiError(null);

    try {
      const payload = validRecords.map((r) => ({
        metric_type: r.metric_type,
        value: r.value,
        recorded_at: r.recorded_at,
        source: r.source,
      }));

      await api.metrics.bulkCreate(site.id, payload);
      onSuccess(validRecords.length);
      onClose();
    } catch (err: unknown) {
      setApiError(
        err instanceof Error ? err.message : 'Failed to import metric records.'
      );
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen || !site) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !importing) onClose();
      }}
    >
      <div
        style={{
          width: 'min(780px, 94vw)',
          maxHeight: 'min(860px, 92vh)',
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          boxShadow: '0 25px 60px -12px rgba(15, 23, 42, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalZoomPop 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #A7F3D0',
              }}
            >
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <div
                style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}
              >
                Import Metrics CSV
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                Target site:{' '}
                <strong style={{ color: '#047857' }}>{site.name}</strong> • Only
                adds rows for this site
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#F1F5F9',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: importing ? 'not-allowed' : 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            fontSize: '12px',
          }}
        >
          {/* Step 1: Upload Box */}
          <div>
            <label
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#1E293B',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              1. Select CSV File
            </label>
            <div
              style={{
                border: '1.5px dashed #CBD5E1',
                borderRadius: '10px',
                padding: '18px',
                textAlign: 'center',
                backgroundColor: '#F8FAFC',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                id="metrics-csv-upload-input"
                style={{ display: 'none' }}
              />
              <label
                htmlFor="metrics-csv-upload-input"
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#64748B',
                }}
              >
                <Upload size={22} color="#059669" />
                {file ? (
                  <span
                    style={{
                      fontWeight: 600,
                      color: '#047857',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <CheckCircle2 size={14} /> {file.name} (
                    {(file.size / 1024).toFixed(1)} KB)
                  </span>
                ) : (
                  <>
                    <span style={{ fontWeight: 500, color: '#0F172A' }}>
                      Click to select a .csv file
                    </span>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                      Compatible with deforestation records, fire hotspots, or
                      custom field sensor telemetry
                    </span>
                  </>
                )}
              </label>
            </div>

            {parseError && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '6px',
                  color: '#991B1B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertCircle size={14} />
                <span>{parseError}</span>
              </div>
            )}
          </div>

          {/* Step 2: Column Mapping */}
          {headers.length > 0 && (
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#0F172A',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Database size={14} color="#059669" />
                <span>
                  2. Flexible Column Mapping (Headers detected: {headers.length}
                  )
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '14px',
                }}
              >
                {/* Metric Type Mapping */}
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#475569',
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  >
                    Metric Type
                  </label>
                  <div
                    style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}
                  >
                    <button
                      type="button"
                      onClick={() => setMetricTypeMode('fixed')}
                      style={{
                        padding: '3px 8px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: '1px solid',
                        borderColor:
                          metricTypeMode === 'fixed' ? '#059669' : '#CBD5E1',
                        backgroundColor:
                          metricTypeMode === 'fixed' ? '#ECFDF5' : '#FFFFFF',
                        color:
                          metricTypeMode === 'fixed' ? '#047857' : '#64748B',
                        cursor: 'pointer',
                      }}
                    >
                      Use Fixed Metric
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetricTypeMode('column')}
                      style={{
                        padding: '3px 8px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: '1px solid',
                        borderColor:
                          metricTypeMode === 'column' ? '#059669' : '#CBD5E1',
                        backgroundColor:
                          metricTypeMode === 'column' ? '#ECFDF5' : '#FFFFFF',
                        color:
                          metricTypeMode === 'column' ? '#047857' : '#64748B',
                        cursor: 'pointer',
                      }}
                    >
                      Map from Column
                    </button>
                  </div>

                  {metricTypeMode === 'fixed' ? (
                    <select
                      value={fixedMetricType}
                      onChange={(e) =>
                        setFixedMetricType(e.target.value as MetricType)
                      }
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '12px',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                      }}
                    >
                      {VALID_METRIC_TYPES.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={metricTypeColumn}
                      onChange={(e) => setMetricTypeColumn(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '12px',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                      }}
                    >
                      <option value="">Select CSV column...</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Value Column */}
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#475569',
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  >
                    Reading Value Column{' '}
                    <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <select
                    value={valueColumn}
                    onChange={(e) => setValueColumn(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                      marginTop: '26px',
                    }}
                  >
                    <option value="">Select CSV column...</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Column */}
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#475569',
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  >
                    Date / Year Column{' '}
                    <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <select
                    value={dateColumn}
                    onChange={(e) => setDateColumn(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                    }}
                  >
                    <option value="">Select CSV column...</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#94A3B8',
                      marginTop: '3px',
                    }}
                  >
                    Supports YYYY, YYYY-MM-DD, or DD/MM/YYYY
                  </div>
                </div>

                {/* Source Column / Fallback */}
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#475569',
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  >
                    Source Identifier (Optional)
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      value={sourceColumn}
                      onChange={(e) => setSourceColumn(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '12px',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                      }}
                    >
                      <option value="">Default fallback text</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          Column: {h}
                        </option>
                      ))}
                    </select>

                    {!sourceColumn && (
                      <input
                        type="text"
                        value={defaultSource}
                        onChange={(e) => setDefaultSource(e.target.value)}
                        placeholder="csv_import"
                        style={{
                          width: '110px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          fontSize: '12px',
                          backgroundColor: '#FFFFFF',
                          color: '#0F172A',
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#94A3B8',
                      marginTop: '3px',
                    }}
                  >
                    Defaults to &quot;{defaultSource || 'csv_import'}&quot;
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Validation Summary & Preview */}
          {headers.length > 0 && valueColumn && dateColumn && (
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#0F172A',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Table size={14} color="#059669" />
                <span>3. Validation & Ingestion Preview</span>
              </div>

              {/* Status Banner */}
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor:
                    validRecords.length > 0 ? '#F0FDF4' : '#FEF2F2',
                  border: `1px solid ${validRecords.length > 0 ? '#BBF7D0' : '#FECACA'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {validRecords.length > 0 ? (
                    <CheckCircle2 size={16} color="#059669" />
                  ) : (
                    <AlertCircle size={16} color="#DC2626" />
                  )}
                  <span
                    style={{
                      fontWeight: 600,
                      color: validRecords.length > 0 ? '#166534' : '#991B1B',
                    }}
                  >
                    {validRecords.length} metric reading
                    {validRecords.length === 1 ? '' : 's'} ready to import for{' '}
                    {site.name}
                  </span>
                </div>

                {invalidRowErrors.length > 0 && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#B45309',
                      backgroundColor: '#FEF3C7',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #FDE68A',
                    }}
                  >
                    {invalidRowErrors.length} row
                    {invalidRowErrors.length === 1 ? '' : 's'} skipped
                  </span>
                )}
              </div>

              {/* Error Breakdown (if any rows skipped) */}
              {invalidRowErrors.length > 0 && (
                <div
                  style={{
                    marginBottom: '12px',
                    padding: '10px 12px',
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    borderRadius: '8px',
                    maxHeight: '90px',
                    overflowY: 'auto',
                    fontSize: '11px',
                    color: '#92400E',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <AlertTriangle size={12} />
                    <span>Row Validation Log:</span>
                  </div>
                  {invalidRowErrors.slice(0, 8).map((err, i) => (
                    <div key={i} style={{ fontFamily: 'monospace' }}>
                      • Row {err.rowNumber}: {err.reason} (skipped)
                    </div>
                  ))}
                  {invalidRowErrors.length > 8 && (
                    <div style={{ fontStyle: 'italic', marginTop: '2px' }}>
                      ...and {invalidRowErrors.length - 8} more skipped rows.
                    </div>
                  )}
                </div>
              )}

              {/* 5-Row Data Preview Table */}
              {validRecords.length > 0 && (
                <div
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '11.5px',
                      textAlign: 'left',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: '#F1F5F9',
                          borderBottom: '1px solid #CBD5E1',
                        }}
                      >
                        <th
                          style={{
                            padding: '6px 10px',
                            color: '#475569',
                            fontWeight: 600,
                          }}
                        >
                          Date
                        </th>
                        <th
                          style={{
                            padding: '6px 10px',
                            color: '#475569',
                            fontWeight: 600,
                          }}
                        >
                          Metric Type
                        </th>
                        <th
                          style={{
                            padding: '6px 10px',
                            color: '#475569',
                            fontWeight: 600,
                          }}
                        >
                          Reading Value
                        </th>
                        <th
                          style={{
                            padding: '6px 10px',
                            color: '#475569',
                            fontWeight: 600,
                          }}
                        >
                          Source
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {validRecords.slice(0, 5).map((r, i) => (
                        <tr
                          key={i}
                          style={{
                            borderBottom: i < 4 ? '1px solid #F1F5F9' : 'none',
                            backgroundColor:
                              i % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                          }}
                        >
                          <td
                            style={{
                              padding: '6px 10px',
                              fontFamily: 'monospace',
                              color: '#0F172A',
                            }}
                          >
                            {r.recorded_at}
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#ECFDF5',
                                color: '#047857',
                                border: '1px solid #A7F3D0',
                                fontWeight: 600,
                                fontSize: '10.5px',
                              }}
                            >
                              {r.metric_type}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: '6px 10px',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: '#0F172A',
                            }}
                          >
                            {r.value.toLocaleString(undefined, {
                              maximumFractionDigits: 4,
                            })}
                          </td>
                          <td style={{ padding: '6px 10px', color: '#64748B' }}>
                            {r.source}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {apiError && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                color: '#991B1B',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={15} />
              <span>{apiError}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '11px', color: '#64748B' }}>
            Will append strictly to <strong>{site.name}</strong>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#475569',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                cursor: importing ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleCommitImport}
              disabled={!validRecords.length || importing}
              className="chat-btn-spring"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#FFFFFF',
                backgroundColor: '#059669',
                backgroundImage:
                  'linear-gradient(135deg, #059669 0%, #047857 100%)',
                border: 'none',
                borderRadius: '6px',
                cursor:
                  !validRecords.length || importing ? 'not-allowed' : 'pointer',
                opacity: !validRecords.length || importing ? 0.5 : 1,
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
              }}
            >
              <span>
                {importing
                  ? 'Ingesting Records...'
                  : `Confirm & Import ${validRecords.length} Reading${validRecords.length === 1 ? '' : 's'}`}
              </span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
