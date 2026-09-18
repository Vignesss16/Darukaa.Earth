import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Site,
  Project,
  User,
  UserRole,
  SiteMetric,
  DegradationAlert,
  AssistantChatResponse,
  ChatHistoryItem,
} from '../types';
import { api } from '../api';
import { SiteMetricsChart } from './SiteMetricsChart';
import { AlertBanner } from './AlertBanner';
import { AlertDigestModal } from './AlertDigestModal';
import { ImportMetricsModal } from './ImportMetricsModal';
import {
  X,
  Calendar,
  Trash2,
  Globe,
  Trees,
  LineChart,
  RefreshCw,
  Info,
  History,
  Printer,
  Bot,
  Send,
  ShieldAlert,
  ShieldCheck,
  Mail,
  Sparkles,
  Pencil,
  Lock,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  RotateCcw,
  Zap,
  Maximize2,
  Minimize2,
  Upload,
} from 'lucide-react';

interface SiteDetailPanelProps {
  site: Site | null;
  projects: Project[];
  currentUser?: User | null;
  onClose: () => void;
  onDeleteSite: (id: number) => void;
  onEditSite?: (site: Site) => void;
  userRole?: UserRole;
  isEditingBoundary?: boolean;
}

export const SiteDetailPanel: React.FC<SiteDetailPanelProps> = ({
  site,
  projects,
  currentUser,
  onClose,
  onDeleteSite,
  onEditSite,
  userRole,
  isEditingBoundary,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'analytics' | 'history' | 'assistant'
  >('overview');
  const [metrics, setMetrics] = useState<SiteMetric[]>([]);
  const [siteAlerts, setSiteAlerts] = useState<DegradationAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [digestModalOpen, setDigestModalOpen] = useState<boolean>(false);
  const [csvModalOpen, setCsvModalOpen] = useState<boolean>(false);

  /**
   * True only when all loaded metrics come from the mock NDVI generator.
   * Only INPE-specific sources ('INPE PRODES', 'INPE BDQueimadas') mark a site
   * as having real imported data. 'derived_mrv_model' and 'field_survey' are
   * also used on mock sites (for CARBON_TONS / BIODIVERSITY_INDEX), so they
   * must NOT be included here or the demo buttons disappear on mock sites too.
   */
  const REAL_DATA_SOURCES = new Set(['INPE PRODES', 'INPE BDQueimadas']);
  const isMockSite =
    metrics.length === 0 ||
    metrics.every((m) => !REAL_DATA_SOURCES.has(m.source ?? ''));

  // AI Assistant Chat State
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: 'user' | 'assistant'; text: string }>
  >([]);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [isChatEnlarged, setIsChatEnlarged] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight + 1000,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
    }
  }, []);

  useEffect(() => {
    setIsChatEnlarged(false);
  }, [site?.id]);

  useEffect(() => {
    if (!isChatEnlarged) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsChatEnlarged(false);
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isChatEnlarged]);

  useEffect(() => {
    const t = setTimeout(() => scrollToBottom(false), 50);
    return () => clearTimeout(t);
  }, [isChatEnlarged, scrollToBottom]);

  useEffect(() => {
    if (activeTab === 'assistant') {
      scrollToBottom(false);
      const t1 = setTimeout(() => scrollToBottom(true), 50);
      const t2 = setTimeout(() => scrollToBottom(true), 180);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [chatMessages, chatLoading, activeTab, scrollToBottom]);

  useEffect(() => {
    if (site?.id) {
      setIsCollapsed(false);
      loadSiteMetricsAndAlerts(site.id);
      setChatMessages([
        {
          sender: 'assistant',
          text: `Hello! I am monitoring telemetry for '${site.name}' (${site.site_type} ecosystem, ${site.area_hectares != null ? site.area_hectares.toFixed(2) + ' ha' : 'unmapped area'}). You can ask me about canopy density, degradation alerts, carbon estimates, or boundary metrics.`,
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site?.id]);

  useEffect(() => {
    if (isEditingBoundary) {
      setIsCollapsed(true);
    }
  }, [isEditingBoundary]);

  const loadSiteMetricsAndAlerts = async (siteId: number) => {
    setLoading(true);
    try {
      const [fetchedMetrics, fetchedAlerts] = await Promise.all([
        api.metrics.get(siteId),
        api.alerts.list(siteId),
      ]);
      setMetrics(fetchedMetrics);
      setSiteAlerts(fetchedAlerts);
    } catch (err) {
      console.error('Failed to load site metrics or alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedMetrics = async (includeSpike: boolean) => {
    if (!site) return;
    setSeeding(true);
    try {
      await api.metrics.seed(site.id, includeSpike);
      await loadSiteMetricsAndAlerts(site.id);
    } catch (err) {
      console.error('Failed to seed site metrics:', err);
    } finally {
      setSeeding(false);
    }
  };

  const quickPrompts = [
    {
      label: 'Canopy & NDVI',
      query: 'What is the current canopy density and NDVI trend for this site?',
    },
    {
      label: 'Degradation alerts',
      query:
        'Are there any active degradation or deforestation alerts for this site?',
    },
    {
      label: 'Carbon biomass',
      query:
        'What is the estimated carbon biomass and sequestration rate for this site?',
    },
    {
      label: 'Boundary & area',
      query:
        'Can you summarize the boundary geometry, acreage, and ecosystem classification?',
    },
  ];

  const handleSendChatMessage = async (
    textToSend?: string,
    e?: React.FormEvent
  ) => {
    if (e) e.preventDefault();
    const userText = (textToSend || inputMsg).trim();
    if (!userText || !site || chatLoading) return;

    setInputMsg('');
    setChatMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setChatLoading(true);
    setTimeout(() => scrollToBottom(true), 40);

    const historyPayload: ChatHistoryItem[] = chatMessages
      .slice(-6)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: (m.text || '').slice(0, 20000),
      }));

    try {
      const res: AssistantChatResponse = await api.sites.chatAssistant(
        site.id,
        userText,
        historyPayload
      );
      setChatMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: res.response },
      ]);
    } catch (err: unknown) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `Sorry, I couldn't process your request: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
      ]);
    } finally {
      setChatLoading(false);
      setTimeout(() => scrollToBottom(true), 60);
    }
  };

  const renderInlineContent = (inlineText: string, isUser: boolean) => {
    const parts = inlineText.split(
      /(\*\*.*?\*\*|\*[^*\n]+?\*|\[.*?\]\(.*?\)|\u201cPDF Report\u201d(?:\s+button)?|"PDF Report"(?:\s+button)?|'PDF Report'(?:\s+button)?|\u201cAnalytics\u201d(?:\s+tab)?|"Analytics"(?:\s+tab)?|'Analytics'(?:\s+tab)?)/gi
    );
    return parts.map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong
            key={partIdx}
            style={{
              fontWeight: 700,
              color: isUser ? '#FFFFFF' : '#065F46',
            }}
          >
            {part.slice(2, -2)}
          </strong>
        );
      }

      if (
        part.startsWith('*') &&
        part.endsWith('*') &&
        part.length >= 3 &&
        !part.startsWith('**')
      ) {
        return (
          <em
            key={partIdx}
            style={{
              fontStyle: 'italic',
              color: isUser ? '#E0F2FE' : '#4B5563',
            }}
          >
            {part.slice(1, -1)}
          </em>
        );
      }

      // In-text mention of "PDF Report" button
      if (
        !isUser &&
        /[\u201c"']PDF Report[\u201d"'](?:\s+button)?/i.test(part)
      ) {
        return (
          <button
            key={partIdx}
            type="button"
            onClick={handleExportPDF}
            className="chat-chip-spring"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#ECFDF5',
              color: '#047857',
              border: '1px solid #6EE7B7',
              borderRadius: '6px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              margin: '0 3px',
              verticalAlign: 'baseline',
              boxShadow: '0 1px 2px rgba(4, 120, 87, 0.1)',
            }}
            title="Generate and download Executive PDF Dossier"
          >
            <Printer size={11} />
            <span>PDF Report</span>
          </button>
        );
      }

      // In-text mention of "Analytics" tab
      if (!isUser && /[\u201c"']Analytics[\u201d"'](?:\s+tab)?/i.test(part)) {
        return (
          <button
            key={partIdx}
            type="button"
            onClick={() => setActiveTab('analytics')}
            className="chat-chip-spring"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              border: '1px solid #93C5FD',
              borderRadius: '6px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              margin: '0 3px',
              verticalAlign: 'baseline',
              boxShadow: '0 1px 2px rgba(29, 78, 216, 0.1)',
            }}
            title="Switch to full Analytics view"
          >
            <LineChart size={11} />
            <span>Analytics</span>
          </button>
        );
      }

      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch && !isUser) {
        const [, linkText, linkUrl] = linkMatch;
        const lower = (linkText + linkUrl).toLowerCase();
        if (
          lower.includes('pdf') ||
          lower.includes('dossier') ||
          lower.includes('report') ||
          lower.includes('placeholder') ||
          lower.includes('download') ||
          lower.includes('export_pdf')
        ) {
          return (
            <button
              key={partIdx}
              type="button"
              onClick={handleExportPDF}
              className="chat-chip-spring"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#ECFDF5',
                color: '#047857',
                border: '1px solid #6EE7B7',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                margin: '2px 3px',
                boxShadow: '0 1px 2px rgba(4, 120, 87, 0.1)',
              }}
              title="Generate and download Executive PDF Dossier"
            >
              <Printer size={12} />
              <span>
                {linkText.replace(/^(?:🖨️|\s)+/u, '') ||
                  'Download / Print Dossier'}
              </span>
            </button>
          );
        }
        if (
          lower.includes('chart') ||
          lower.includes('analytics') ||
          lower.includes('ndvi') ||
          lower.includes('open_analytics')
        ) {
          return (
            <button
              key={partIdx}
              type="button"
              onClick={() => setActiveTab('analytics')}
              className="chat-chip-spring"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8',
                border: '1px solid #93C5FD',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                margin: '2px 3px',
                boxShadow: '0 1px 2px rgba(29, 78, 216, 0.1)',
              }}
              title="View interactive time-series NDVI chart"
            >
              <LineChart size={12} />
              <span>
                {linkText.replace(/^(?:📈|\s)+/u, '') || 'Open Analytics Chart'}
              </span>
            </button>
          );
        }
      }

      return part;
    });
  };

  const renderFormattedMessage = (text: string, isUser: boolean) => {
    const rawLines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < rawLines.length) {
      const line = rawLines[i];
      const trimmed = line.trim();

      // Check for markdown table: line contains pipes and next line is a markdown separator row
      if (
        trimmed.startsWith('|') &&
        trimmed.endsWith('|') &&
        i + 1 < rawLines.length &&
        /^\|[\s\-:|]+\|$/.test(rawLines[i + 1].trim())
      ) {
        const headerRow = trimmed
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());
        i += 2; // skip header and separator line
        const bodyRows: string[][] = [];
        while (
          i < rawLines.length &&
          rawLines[i].trim().startsWith('|') &&
          rawLines[i].trim().endsWith('|')
        ) {
          const cells = rawLines[i]
            .trim()
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim());
          bodyRows.push(cells);
          i++;
        }

        elements.push(
          <div
            key={`tbl-${i}`}
            style={{
              overflowX: 'auto',
              margin: '8px 0',
              borderRadius: '8px',
              border: isUser
                ? '1px solid rgba(255,255,255,0.25)'
                : '1px solid #D1D5DB',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <table
              style={{
                width: '100%',
                minWidth: '320px',
                borderCollapse: 'collapse',
                fontSize: '11px',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: isUser ? '#047857' : '#F0FDF4',
                    borderBottom: isUser
                      ? '1px solid rgba(255,255,255,0.25)'
                      : '1px solid #D1FAE5',
                  }}
                >
                  {headerRow.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      style={{
                        padding: '6px 10px',
                        fontWeight: 700,
                        color: isUser ? '#FFFFFF' : '#065F46',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {renderInlineContent(h, isUser)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    style={{
                      backgroundColor:
                        rIdx % 2 === 0
                          ? isUser
                            ? 'rgba(255,255,255,0.06)'
                            : '#FFFFFF'
                          : isUser
                            ? 'rgba(255,255,255,0.12)'
                            : '#F9FAFB',
                      borderBottom:
                        rIdx === bodyRows.length - 1
                          ? 'none'
                          : isUser
                            ? '1px solid rgba(255,255,255,0.1)'
                            : '1px solid #F3F4F6',
                    }}
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        style={{
                          padding: '6px 10px',
                          color: isUser ? '#F3F4F6' : '#1F2937',
                          verticalAlign: 'top',
                          whiteSpace: cIdx < 2 ? 'nowrap' : 'normal',
                          wordBreak: 'normal',
                        }}
                      >
                        {renderInlineContent(cell, isUser)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      // Horizontal rule
      if (/^(---|\*\*\*|___)$/.test(trimmed)) {
        elements.push(
          <hr
            key={`hr-${i}`}
            style={{
              border: 'none',
              borderTop: isUser
                ? '1px solid rgba(255,255,255,0.3)'
                : '1px solid #E5E7EB',
              margin: '8px 0',
            }}
          />
        );
        i++;
        continue;
      }

      // Markdown headings (###, ####, ##, #)
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const title = headingMatch[2];
        const fontSize = level <= 2 ? '13px' : level === 3 ? '12px' : '11.5px';
        elements.push(
          <div
            key={`h-${i}`}
            style={{
              fontWeight: 700,
              fontSize,
              color: isUser ? '#FFFFFF' : '#065F46',
              marginTop: '10px',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {renderInlineContent(title, isUser)}
          </div>
        );
        i++;
        continue;
      }

      // Regular line or bullet/numbered list item
      const isBullet = /^\s*([•\-*]|\d+\.)\s+/.test(line);
      const indent = line.search(/\S/);
      const paddingLeft = indent > 2 ? '16px' : isBullet ? '8px' : '0px';

      elements.push(
        <div
          key={`line-${i}`}
          style={{
            minHeight: trimmed === '' ? '6px' : 'auto',
            paddingLeft,
            marginBottom: isBullet ? '3px' : '2px',
            lineHeight: 1.45,
          }}
        >
          {renderInlineContent(line, isUser)}
        </div>
      );
      i++;
    }

    return elements;
  };

  const handleResetChat = () => {
    if (!site) return;
    setChatMessages([
      {
        sender: 'assistant',
        text: `Hello! I am monitoring telemetry for '${site.name}' (${site.site_type} ecosystem, ${site.area_hectares != null ? site.area_hectares.toFixed(2) + ' ha' : 'unmapped area'}). You can ask me about canopy density, degradation alerts, carbon estimates, or boundary metrics.`,
      },
    ]);
  };

  const handleExportPDF = () => {
    const originalTitle = document.title;
    document.title = `${(site?.name || 'Site').replace(/\s+/g, '_')}_Environmental_Dossier`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  if (!site) return null;

  const parentProject = projects.find((p) => p.id === site.project_id);
  const isOwner =
    site.created_by_id === currentUser?.id ||
    (!site.created_by_id && parentProject?.owner_id === currentUser?.id);
  const canEdit =
    currentUser?.role === 'admin' ||
    (currentUser?.role === 'analyst' && isOwner);

  const getSiteTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'mangrove':
        return 'badge-teal';
      case 'reforestation':
        return 'badge-emerald';
      default:
        return 'badge-neutral';
    }
  };

  const coords = site.geojson?.coordinates?.[0] || [];
  const isClosed =
    coords.length > 3 &&
    coords[0][0] === coords[coords.length - 1][0] &&
    coords[0][1] === coords[coords.length - 1][1];
  const vertexCount = isClosed ? coords.length - 1 : coords.length;
  const centroidLat = coords.length > 0 ? coords[0][1].toFixed(4) : '11.2700';
  const centroidLng = coords.length > 0 ? coords[0][0].toFixed(4) : '75.8200';

  const canopyMetrics = metrics
    .filter((m) => m.metric_type === 'canopy_cover')
    .sort(
      (a, b) =>
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
  const latestCanopy =
    canopyMetrics.length > 0
      ? canopyMetrics[canopyMetrics.length - 1].value.toFixed(1)
      : '78.5';

  const carbonMetrics = metrics
    .filter((m) => m.metric_type === 'carbon_tons')
    .sort(
      (a, b) =>
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
  const latestCarbon =
    carbonMetrics.length > 0
      ? carbonMetrics[carbonMetrics.length - 1].value.toFixed(0)
      : '1,250';

  const ndviMetrics = metrics
    .filter((m) => m.metric_type === 'ndvi')
    .sort(
      (a, b) =>
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
  const latestNdvi =
    ndviMetrics.length > 0
      ? ndviMetrics[ndviMetrics.length - 1].value.toFixed(2)
      : '0.78';

  // Derive what data types are present on this site — drives the section title
  const hasVegetationData = metrics.some(
    (m) => m.metric_type === 'ndvi' || m.metric_type === 'canopy_cover'
  );
  const hasDisturbanceData = metrics.some(
    (m) =>
      m.metric_type === 'deforestation_area_km2' ||
      m.metric_type === 'fire_incidents'
  );
  const chartSectionTitle =
    hasVegetationData && hasDisturbanceData
      ? 'Metrics Time-Series'
      : hasDisturbanceData
        ? 'Disturbance Time-Series'
        : 'NDVI & Canopy Cover Time-Series';

  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const renderChatInterface = (isEnlarged: boolean) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        height: '100%',
        backgroundColor: '#F8FAFC',
        overflow: 'hidden',
      }}
    >
      {/* Chat Header */}
      <div
        style={{
          padding: isEnlarged ? '14px 20px' : '10px 14px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          boxShadow: isEnlarged ? '0 1px 4px rgba(15, 23, 42, 0.05)' : 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isEnlarged ? '12px' : '8px',
            minWidth: 0,
            flex: 1,
          }}
        >
          <div
            style={{
              width: isEnlarged ? '34px' : '28px',
              height: isEnlarged ? '34px' : '28px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            <Sparkles size={isEnlarged ? 18 : 15} />
            <span
              className="pulse-aura"
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10B981',
                border: '1.5px solid #FFFFFF',
              }}
            />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: isEnlarged ? '14px' : '12px',
                fontWeight: 700,
                color: '#0F172A',
                lineHeight: 1.25,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Darukaa Planetary AI</span>
              {isEnlarged && site && (
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    color: '#1E293B',
                    backgroundColor: '#F1F5F9',
                    padding: '1px 8px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {site.name} • {site.site_type}
                  {site.area_hectares != null
                    ? ` • ${site.area_hectares.toFixed(2)} ha`
                    : ''}
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: isEnlarged ? '11px' : '10.5px',
                color: '#64748B',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginTop: '2px',
              }}
            >
              {isEnlarged && site
                ? `Real-time ecological telemetry, multi-spectral NDVI/EVI trends, carbon stocks & monitoring for ${site.name}`
                : `Ground-truth telemetry for ${site?.name || 'Site'}`}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0,
            marginLeft: '8px',
          }}
        >
          <button
            type="button"
            onClick={handleResetChat}
            className="chat-chip-spring"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: isEnlarged ? '4px 10px' : '3px 7px',
              fontSize: isEnlarged ? '11.5px' : '11px',
              color: '#64748B',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            title="Reset chat to initial telemetry briefing"
          >
            <RotateCcw size={isEnlarged ? 12 : 11} />
            <span>Reset</span>
          </button>

          {!isEnlarged ? (
            <button
              type="button"
              onClick={() => setIsChatEnlarged(true)}
              className="chat-chip-spring"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 7px',
                fontSize: '11px',
                color: '#0F172A',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
              title="Enlarge chatbot to centered modal view"
            >
              <Maximize2 size={11} color="#059669" />
              <span>Enlarge</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsChatEnlarged(false)}
                className="chat-chip-spring"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  color: '#047857',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                title="Minimize back to drawer panel"
              >
                <Minimize2 size={12} />
                <span>Minimize</span>
              </button>

              <button
                type="button"
                onClick={() => setIsChatEnlarged(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  color: '#64748B',
                  backgroundColor: '#F1F5F9',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Close enlarged view (Esc)"
              >
                <X size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Chat Thread */}
      <div
        ref={chatContainerRef}
        style={{
          flex: 1,
          minHeight: 0,
          padding: isEnlarged ? '20px 24px' : '14px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: isEnlarged ? '16px' : '12px',
          fontSize: isEnlarged ? '13px' : '12px',
        }}
      >
        {chatMessages.map((msg, idx) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={idx}
              className="chat-spring-in"
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                gap: isEnlarged ? '10px' : '8px',
                alignItems: 'flex-start',
              }}
            >
              {!isUser && (
                <div
                  style={{
                    width: isEnlarged ? '28px' : '24px',
                    height: isEnlarged ? '28px' : '24px',
                    borderRadius: '50%',
                    background:
                      'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    flexShrink: 0,
                    marginTop: '2px',
                    boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)',
                  }}
                >
                  <Bot size={isEnlarged ? 15 : 13} />
                </div>
              )}

              {(() => {
                const promptText = (
                  idx > 0 && chatMessages[idx - 1]?.sender === 'user'
                    ? chatMessages[idx - 1].text
                    : ''
                )
                  .toLowerCase()
                  .trim();

                const userRequestedChart =
                  !isUser &&
                  /(chart|graph|plot|visual|trendline|time[\s-]?series)/i.test(
                    promptText
                  );

                const userRequestedAnalysis =
                  !isUser &&
                  /(analysis|audit|deep\s*dive|breakdown|full\s*report|detailed\s*report|telemetry\s*summary)/i.test(
                    promptText
                  );

                const hasInlinePDFButton =
                  !isUser &&
                  (/[\u201c"']PDF Report[\u201d"'](?:\s+button)?/i.test(
                    msg.text
                  ) ||
                    /\[.*?\]\(.*?\)/i.test(msg.text));

                const showExportWidget =
                  !isUser &&
                  /(pdf|dossier|export|download\s*report)/i.test(promptText) &&
                  !hasInlinePDFButton;

                const hasWidgets =
                  userRequestedChart ||
                  userRequestedAnalysis ||
                  showExportWidget;

                return (
                  <div
                    style={{
                      maxWidth: isUser
                        ? isEnlarged
                          ? 'min(640px, 75%)'
                          : '82%'
                        : isEnlarged
                          ? 'min(860px, 92%)'
                          : hasWidgets
                            ? '96%'
                            : '85%',
                      width: hasWidgets ? '100%' : 'auto',
                      padding: isEnlarged ? '12px 18px' : '10px 14px',
                      borderRadius: isUser
                        ? '14px 14px 2px 14px'
                        : '14px 14px 14px 2px',
                      fontSize: isEnlarged ? '13px' : '12px',
                      lineHeight: '1.58',
                      backgroundColor: isUser ? '#059669' : '#FFFFFF',
                      backgroundImage: isUser
                        ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                        : 'none',
                      color: isUser ? '#FFFFFF' : '#0F172A',
                      border: isUser ? 'none' : '1px solid #E2E8F0',
                      boxShadow: isUser
                        ? '0 3px 8px rgba(5, 150, 105, 0.25)'
                        : '0 2px 6px rgba(15, 23, 42, 0.04)',
                      wordBreak: 'break-word',
                    }}
                  >
                    {renderFormattedMessage(msg.text, isUser)}

                    {userRequestedAnalysis && (
                      <div
                        style={{
                          marginTop: '12px',
                          paddingTop: '10px',
                          borderTop: '1px solid #E2E8F0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: isEnlarged ? '10px' : '6px',
                          }}
                        >
                          <div
                            style={{
                              backgroundColor: '#ECFDF5',
                              border: '1px solid #A7F3D0',
                              borderRadius: '6px',
                              padding: isEnlarged ? '8px 10px' : '5px 6px',
                              textAlign: 'center',
                            }}
                          >
                            <div
                              style={{
                                fontSize: isEnlarged ? '10px' : '9px',
                                color: '#047857',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                              }}
                            >
                              Canopy
                            </div>
                            <div
                              style={{
                                fontSize: isEnlarged ? '14px' : '12px',
                                fontWeight: 800,
                                color: '#064E3B',
                                fontFamily: 'monospace',
                              }}
                            >
                              {latestCanopy}%
                            </div>
                          </div>

                          <div
                            style={{
                              backgroundColor: '#FEF3C7',
                              border: '1px solid #FDE68A',
                              borderRadius: '6px',
                              padding: isEnlarged ? '8px 10px' : '5px 6px',
                              textAlign: 'center',
                            }}
                          >
                            <div
                              style={{
                                fontSize: isEnlarged ? '10px' : '9px',
                                color: '#B45309',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                              }}
                            >
                              Carbon
                            </div>
                            <div
                              style={{
                                fontSize: isEnlarged ? '14px' : '12px',
                                fontWeight: 800,
                                color: '#78350F',
                                fontFamily: 'monospace',
                              }}
                            >
                              {latestCarbon} t
                            </div>
                          </div>

                          <div
                            style={{
                              backgroundColor: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              borderRadius: '6px',
                              padding: isEnlarged ? '8px 10px' : '5px 6px',
                              textAlign: 'center',
                            }}
                          >
                            <div
                              style={{
                                fontSize: isEnlarged ? '10px' : '9px',
                                color: '#1D4ED8',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                              }}
                            >
                              NDVI
                            </div>
                            <div
                              style={{
                                fontSize: isEnlarged ? '14px' : '12px',
                                fontWeight: 800,
                                color: '#1E3A8A',
                                fontFamily: 'monospace',
                              }}
                            >
                              {latestNdvi}
                            </div>
                          </div>

                          <div
                            style={{
                              backgroundColor:
                                siteAlerts.length > 0 ? '#FEE2E2' : '#F0FDF4',
                              border:
                                siteAlerts.length > 0
                                  ? '1px solid #FECACA'
                                  : '1px solid #BBF7D0',
                              borderRadius: '6px',
                              padding: isEnlarged ? '8px 10px' : '5px 6px',
                              textAlign: 'center',
                            }}
                          >
                            <div
                              style={{
                                fontSize: isEnlarged ? '10px' : '9px',
                                color:
                                  siteAlerts.length > 0 ? '#B91C1C' : '#15803D',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                              }}
                            >
                              Alerts
                            </div>
                            <div
                              style={{
                                fontSize: isEnlarged ? '14px' : '12px',
                                fontWeight: 800,
                                color:
                                  siteAlerts.length > 0 ? '#991B1B' : '#166534',
                                fontFamily: 'monospace',
                              }}
                            >
                              {siteAlerts.length} Active
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {userRequestedChart && metrics.length > 0 && (
                      <div
                        style={{
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          padding: isEnlarged ? '12px 16px' : '10px',
                          marginTop: '10px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: isEnlarged ? '12px' : '11px',
                              fontWeight: 700,
                              color: '#0F172A',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <LineChart size={13} color="#059669" /> Live
                            Multi-Spectral Telemetry Chart
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (isEnlarged) setIsChatEnlarged(false);
                              setActiveTab('analytics');
                            }}
                            className="chat-chip-spring"
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 600,
                              color: '#1D4ED8',
                              background: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              borderRadius: '4px',
                              padding: '2px 8px',
                              cursor: 'pointer',
                            }}
                          >
                            Full Analytics ↗
                          </button>
                        </div>

                        <div
                          style={{
                            height: isEnlarged ? '240px' : '175px',
                            width: '100%',
                            position: 'relative',
                          }}
                        >
                          <SiteMetricsChart
                            metrics={metrics}
                            height={isEnlarged ? '230px' : '170px'}
                          />
                        </div>
                      </div>
                    )}

                    {showExportWidget && (
                      <div style={{ marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={handleExportPDF}
                          className="chat-chip-spring"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: '#059669',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            padding: isEnlarged ? '6px 14px' : '5px 12px',
                            fontSize: isEnlarged ? '12px' : '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(5, 150, 105, 0.25)',
                          }}
                          title="Download certified PDF dossier"
                        >
                          <Printer size={13} />
                          <span>Export PDF Dossier</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {isUser && (
                <div
                  style={{
                    width: isEnlarged ? '28px' : '24px',
                    height: isEnlarged ? '28px' : '24px',
                    borderRadius: '50%',
                    backgroundColor: '#1E293B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <UserIcon size={isEnlarged ? 14 : 12} />
                </div>
              )}
            </div>
          );
        })}

        {chatLoading && (
          <div
            className="chat-spring-in"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: isEnlarged ? '28px' : '24px',
                height: isEnlarged ? '28px' : '24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                flexShrink: 0,
              }}
            >
              <Bot size={isEnlarged ? 15 : 13} />
            </div>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                padding: isEnlarged ? '10px 16px' : '8px 14px',
                borderRadius: '14px 14px 14px 2px',
                fontSize: isEnlarged ? '12px' : '11px',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                <span
                  className="chat-dot-1"
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    backgroundColor: '#059669',
                    display: 'inline-block',
                  }}
                />
                <span
                  className="chat-dot-2"
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    backgroundColor: '#059669',
                    display: 'inline-block',
                  }}
                />
                <span
                  className="chat-dot-3"
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    backgroundColor: '#059669',
                    display: 'inline-block',
                  }}
                />
              </div>
              <span>Analyzing site telemetry & sensor context...</span>
            </div>
          </div>
        )}

        {/* Auto Scroll Anchor */}
        <div
          ref={chatEndRef}
          style={{ height: '1px', width: '100%', flexShrink: 0 }}
        />
      </div>

      {/* Spring Quick Suggestion Chips */}
      <div
        style={{
          padding: isEnlarged ? '10px 20px' : '6px 12px',
          backgroundColor: '#F1F5F9',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          gap: isEnlarged ? '8px' : '6px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            type="button"
            disabled={chatLoading}
            onClick={() => handleSendChatMessage(qp.query)}
            className="chat-chip-spring"
            style={{
              padding: isEnlarged ? '5px 12px' : '3px 9px',
              fontSize: isEnlarged ? '11.5px' : '10.5px',
              fontWeight: 500,
              backgroundColor: '#FFFFFF',
              color: '#334155',
              border: '1px solid #CBD5E1',
              borderRadius: '9999px',
              cursor: 'pointer',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Zap size={isEnlarged ? 11 : 10} color="#059669" />
            <span>{qp.label}</span>
          </button>
        ))}
      </div>

      {/* Chat Input Form */}
      <div
        style={{
          padding: isEnlarged ? '12px 20px' : '8px 10px',
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E2E8F0',
          flexShrink: 0,
        }}
      >
        <form
          onSubmit={(e) => handleSendChatMessage(undefined, e)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isEnlarged ? '10px' : '8px',
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: isEnlarged ? '4px 10px' : '2px 8px',
              transition: 'all 0.15s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#059669';
              e.currentTarget.style.boxShadow =
                '0 0 0 2px rgba(5, 150, 105, 0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder={`Ask questions about ${site?.name || 'this site'}...`}
              disabled={chatLoading}
              style={{
                width: '100%',
                padding: isEnlarged ? '7px 4px' : '6px 4px',
                fontSize: isEnlarged ? '13px' : '12px',
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                color: '#0F172A',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!inputMsg.trim() || chatLoading}
            className="chat-btn-spring"
            style={{
              width: isEnlarged ? '36px' : '32px',
              height: isEnlarged ? '36px' : '32px',
              backgroundColor: '#059669',
              backgroundImage:
                'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor:
                !inputMsg.trim() || chatLoading ? 'not-allowed' : 'pointer',
              opacity: !inputMsg.trim() || chatLoading ? 0.45 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            title="Send telemetry query"
          >
            <Send size={isEnlarged ? 15 : 13} />
          </button>
        </form>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '4px',
            fontSize: isEnlarged ? '10.5px' : '9.5px',
            color: '#94A3B8',
            marginTop: '5px',
          }}
        >
          <span>
            ⚡ AI-generated • Scoped strictly to telemetry for{' '}
            {site?.name || 'Site'}
            {isEnlarged ? ' • Press Enter to query • Esc to minimize' : ''}
          </span>
        </div>
      </div>
    </div>
  );

  const isPanelOpen = Boolean(site && !isCollapsed);

  return (
    <>
      {/* Middle Drawer Expand Handle (Visible when panel is collapsed) */}
      {site && isCollapsed && (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="print:hidden animate-fade-in"
          style={{
            position: 'absolute',
            top: '50%',
            right: 0,
            transform: 'translateY(-50%)',
            zIndex: 25,
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRight: 'none',
            borderRadius: '10px 0 0 10px',
            boxShadow: '-4px 4px 16px rgba(15, 23, 42, 0.12)',
            padding: '12px 9px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            color: '#0F172A',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F8FAFC';
            e.currentTarget.style.boxShadow =
              '-5px 6px 20px rgba(15, 23, 42, 0.18)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.boxShadow =
              '-4px 4px 16px rgba(15, 23, 42, 0.12)';
          }}
          title="Open Site Telemetry Drawer"
        >
          <ChevronLeft size={16} color="#059669" strokeWidth={2.5} />
          <Trees size={14} color="#059669" />
          <span
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              fontWeight: 700,
              fontSize: '11px',
              letterSpacing: '0.04em',
              color: '#065F46',
              maxHeight: '140px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {site.name}
          </span>
          {siteAlerts.length > 0 && (
            <span
              style={{
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                fontSize: '9px',
                fontWeight: 800,
                padding: '2px 4px',
                borderRadius: '9999px',
                border: '1px solid #FCA5A5',
              }}
            >
              {siteAlerts.length}
            </span>
          )}
        </button>
      )}

      <div
        className="printable-site-panel font-sans"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '100%',
          maxWidth: 'min(420px, calc(100vw - 240px))',
          height: '100%',
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid var(--color-line)',
          boxShadow: '-4px 0 16px rgba(15, 23, 42, 0.08)',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          transform: isPanelOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: isPanelOpen ? 'auto' : 'none',
        }}
      >
        {/* Middle Drawer Collapse Handle (Visible on left border when drawer is open) */}
        {isPanelOpen && (
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="print:hidden"
            style={{
              position: 'absolute',
              left: '-18px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '18px',
              height: '52px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRight: 'none',
              borderRadius: '6px 0 0 6px',
              boxShadow: '-3px 2px 8px rgba(15, 23, 42, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
              zIndex: 35,
              padding: 0,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
              e.currentTarget.style.color = '#0F172A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.color = '#475569';
            }}
            title="Collapse drawer"
          >
            <ChevronRight size={14} strokeWidth={2.5} />
          </button>
        )}
        {/* Printable Executive Single-Page PDF Report (Only visible during window.print()) */}
        <div
          className="hidden print:block printable-pdf-container"
          style={{
            width: '100%',
            maxWidth: '210mm',
            height: '286mm',
            maxHeight: '286mm',
            margin: '0 auto',
            padding: '22px 24px',
            boxSizing: 'border-box',
            overflow: 'hidden',
            pageBreakInside: 'avoid',
            pageBreakAfter: 'avoid',
            backgroundColor: '#FFFFFF',
            fontFamily: "'Inter', -apple-system, sans-serif",
            position: 'relative',
          }}
        >
          {/* Vibrant Hero Header Banner */}
          <div
            style={{
              background:
                'linear-gradient(135deg, #064E3B 0%, #065F46 35%, #0F766E 70%, #0284C7 100%)',
              borderRadius: '14px',
              padding: '18px 22px',
              color: '#FFFFFF',
              marginBottom: '16px',
              boxShadow: '0 4px 14px rgba(6, 78, 59, 0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '9999px',
                      backgroundColor: '#86EFAC',
                      boxShadow: '0 0 8px #86EFAC',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#A7F3D0',
                    }}
                  >
                    Darukaa.Earth Planetary Ops • Telemetry Dossier
                  </span>
                </div>
                <h1
                  style={{
                    fontSize: '26px',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    margin: '0 0 6px 0',
                    color: '#FFFFFF',
                  }}
                >
                  {site.name}
                </h1>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '11px',
                    color: '#D1FAE5',
                  }}
                >
                  <span
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#FFFFFF',
                    }}
                  >
                    {site.site_type}
                  </span>
                  <span>
                    Parent Project:{' '}
                    <strong>
                      {parentProject?.name || 'Default Conservation'}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Monitored Area:{' '}
                    <strong>
                      {site.area_hectares != null
                        ? `${site.area_hectares.toFixed(2)} ha`
                        : 'N/A'}
                    </strong>
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#86EFAC',
                    marginBottom: '4px',
                  }}
                >
                  REF: SITE-00{site.id}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: '#E0F2FE',
                    fontFamily: 'monospace',
                  }}
                >
                  {reportDate}
                </div>
              </div>
            </div>
          </div>

          {/* 4 Colorful Key Metric KPI Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            {/* Card 1: Surface Area */}
            <div
              style={{
                backgroundColor: '#ECFDF5',
                border: '2px solid #10B981',
                borderRadius: '12px',
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#047857',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <Trees size={13} color="#059669" /> Surface Area
              </div>
              <div
                style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  color: '#064E3B',
                  marginTop: '4px',
                  fontFamily: 'monospace',
                }}
              >
                {site.area_hectares != null
                  ? `${site.area_hectares.toFixed(2)} ha`
                  : 'N/A'}
              </div>
              <div
                style={{ fontSize: '10px', color: '#059669', marginTop: '2px' }}
              >
                Monitored Canopy
              </div>
            </div>

            {/* Card 2: Geolocation Fix */}
            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: '2px solid #3B82F6',
                borderRadius: '12px',
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#1D4ED8',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <Globe size={13} color="#2563EB" /> Geolocation Fix
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#1E3A8A',
                  marginTop: '6px',
                  fontFamily: 'monospace',
                }}
              >
                {centroidLat}° N, {centroidLng}° E
              </div>
              <div
                style={{ fontSize: '10px', color: '#2563EB', marginTop: '2px' }}
              >
                WGS84 EPSG:4326
              </div>
            </div>

            {/* Card 3: Biome Class */}
            <div
              style={{
                backgroundColor: '#F0FDFA',
                border: '2px solid #14B8A6',
                borderRadius: '12px',
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#0F766E',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <Sparkles size={13} color="#0D9488" /> Biome Class
              </div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  color: '#134E4A',
                  marginTop: '5px',
                  textTransform: 'capitalize',
                }}
              >
                {site.site_type}
              </div>
              <div
                style={{ fontSize: '10px', color: '#0D9488', marginTop: '2px' }}
              >
                Ecosystem Priority
              </div>
            </div>

            {/* Card 4: Telemetry Status */}
            <div
              style={{
                backgroundColor: siteAlerts.length > 0 ? '#FEF2F2' : '#F0FDF4',
                border:
                  siteAlerts.length > 0
                    ? '2px solid #EF4444'
                    : '2px solid #22C55E',
                borderRadius: '12px',
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: siteAlerts.length > 0 ? '#B91C1C' : '#15803D',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {siteAlerts.length > 0 ? (
                  <ShieldAlert size={13} color="#DC2626" />
                ) : (
                  <ShieldCheck size={13} color="#16A34A" />
                )}
                Telemetry Status
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: siteAlerts.length > 0 ? '#991B1B' : '#166534',
                  marginTop: '6px',
                }}
              >
                {siteAlerts.length > 0
                  ? `${siteAlerts.length} Anomaly Events`
                  : 'Baseline Nominal'}
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: siteAlerts.length > 0 ? '#DC2626' : '#16A34A',
                  marginTop: '2px',
                }}
              >
                {siteAlerts.length > 0
                  ? 'Degradation Detected'
                  : 'Zero Negative Drift'}
              </div>
            </div>
          </div>

          {/* Degradation Anomaly Logs Section */}
          {siteAlerts.length > 0 ? (
            <div
              style={{
                backgroundColor: '#FFF5F5',
                border: '2px solid #FCA5A5',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#991B1B',
                    fontWeight: 800,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <ShieldAlert size={16} color="#DC2626" /> Active Degradation
                  Telemetry Logs ({siteAlerts.length})
                </div>
                <span
                  style={{
                    backgroundColor: '#FEE2E2',
                    color: '#991B1B',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    border: '1px solid #F87171',
                  }}
                >
                  URGENT VERIFICATION
                </span>
              </div>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                {siteAlerts.slice(0, 4).map((a, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #FECACA',
                      borderLeft: '4px solid #DC2626',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: '#991B1B',
                          fontSize: '11px',
                        }}
                      >
                        {a.metric_type.toUpperCase().replace('_', ' ')} DROP (-
                        {a.drop_percentage.toFixed(1)}%)
                      </div>
                      <div
                        style={{
                          color: '#4B5563',
                          fontSize: '10.5px',
                          marginTop: '2px',
                        }}
                      >
                        {a.message}
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: 'right',
                        fontSize: '10px',
                        color: '#6B7280',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Recorded:{' '}
                      <span style={{ fontWeight: 600, color: '#1F2937' }}>
                        {a.recorded_at}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#F0FDF4',
                border: '2px solid #86EFAC',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <ShieldCheck size={26} color="#16A34A" />
              <div>
                <div
                  style={{
                    fontWeight: 800,
                    color: '#166534',
                    fontSize: '12px',
                  }}
                >
                  Canopy Baseline Stable & Nominal
                </div>
                <div
                  style={{
                    color: '#15803D',
                    fontSize: '11px',
                    marginTop: '2px',
                  }}
                >
                  Copernicus Sentinel-2 optical telemetry shows normal
                  vegetative density without degradation anomalies.
                </div>
              </div>
            </div>
          )}

          {/* Geospatial & Remote Sensing Technical Specifications Table */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1.5px solid #E2E8F0',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                backgroundColor: '#064E3B',
                color: '#FFFFFF',
                padding: '8px 14px',
                fontWeight: 700,
                fontSize: '10px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Geospatial Intelligence & Spatial Polygon Metadata</span>
              <span style={{ color: '#86EFAC' }}>EPSG:4326 (WGS84)</span>
            </div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '10.5px',
              }}
            >
              <tbody>
                <tr
                  style={{
                    borderBottom: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <td
                    style={{
                      padding: '6px 14px',
                      fontWeight: 600,
                      color: '#475569',
                      width: '38%',
                    }}
                  >
                    Geometry Type
                  </td>
                  <td
                    style={{
                      padding: '6px 14px',
                      fontWeight: 700,
                      color: '#0F172A',
                      fontFamily: 'monospace',
                    }}
                  >
                    GeoJSON Polygon (OGC Compliant)
                  </td>
                </tr>
                <tr
                  style={{
                    borderBottom: '1px solid #E2E8F0',
                    backgroundColor: '#F8FAFC',
                  }}
                >
                  <td
                    style={{
                      padding: '6px 14px',
                      fontWeight: 600,
                      color: '#475569',
                    }}
                  >
                    Boundary Vertices Count
                  </td>
                  <td
                    style={{
                      padding: '6px 14px',
                      fontWeight: 700,
                      color: '#059669',
                      fontFamily: 'monospace',
                    }}
                  >
                    {vertexCount} vertices closed ring
                  </td>
                </tr>
                <tr
                  style={{
                    borderBottom: '1px solid #E2E8F0',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <td
                    style={{
                      padding: '6px 14px',
                      fontWeight: 600,
                      color: '#475569',
                    }}
                  >
                    Satellite Optical Constellation
                  </td>
                  <td
                    style={{
                      padding: '6px 14px',
                      fontWeight: 700,
                      color: '#0284C7',
                      fontFamily: 'monospace',
                    }}
                  >
                    Copernicus Sentinel-2 MSI (10m Resolution)
                  </td>
                </tr>
                <tr
                  style={{
                    borderBottom: '1px solid #E2E8F0',
                    backgroundColor: '#F8FAFC',
                  }}
                >
                  <td
                    style={{
                      padding: '6px 14px',
                      fontWeight: 600,
                      color: '#475569',
                    }}
                  >
                    Spectral Processing Pipeline
                  </td>
                  <td
                    style={{
                      padding: '6px 14px',
                      fontWeight: 700,
                      color: '#0F172A',
                      fontFamily: 'monospace',
                    }}
                  >
                    Level-2A BOA (Bottom-of-Atmosphere Reflectance) • NDVI Index
                  </td>
                </tr>
                <tr style={{ backgroundColor: '#FFFFFF' }}>
                  <td
                    style={{
                      padding: '6px 14px',
                      fontWeight: 600,
                      color: '#475569',
                    }}
                  >
                    Database Registration
                  </td>
                  <td
                    style={{
                      padding: '6px 14px',
                      fontWeight: 700,
                      color: '#16A34A',
                      fontFamily: 'monospace',
                    }}
                  >
                    PostgreSQL / PostGIS Spatial Database • SHA-256 Checksum
                    Verified
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer with Gradient Bar & Official Certifications */}
          <div
            style={{
              borderTop: '2px solid transparent',
              borderImage:
                'linear-gradient(90deg, #10B981, #06B6D4, #3B82F6) 1',
              paddingTop: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '9.5px',
              color: '#64748B',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '7px',
                  height: '7px',
                  borderRadius: '9999px',
                  backgroundColor: '#10B981',
                }}
              />
              <span style={{ fontWeight: 700, color: '#064E3B' }}>
                Darukaa.Earth Planetary Ops Console
              </span>
              <span>• Certified Autonomous Telemetry Report</span>
            </div>
            <div
              style={{
                fontWeight: 700,
                color: '#0F172A',
                fontFamily: 'monospace',
              }}
            >
              ISO 14064-2 Compliant • Executive Dossier • Page 1 of 1
            </div>
          </div>
        </div>

        {/* Header Bar */}
        <div
          className="print:hidden"
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--color-line)',
            backgroundColor: '#FAFAFA',
          }}
        >
          {/* Top Row: Badge on Left, Proper Close Button on Right */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <span className={`badge ${getSiteTypeBadgeClass(site.site_type)}`}>
              <Trees size={11} /> {site.site_type}
            </span>

            {/* Proper, cleanly centered close button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.15s ease',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FEE2E2';
                e.currentTarget.style.borderColor = '#FCA5A5';
                e.currentTarget.style.color = '#DC2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.color = '#64748B';
              }}
              title="Close inspector panel"
            >
              <X size={15} strokeWidth={2.2} />
            </button>
          </div>

          {/* Site Title and Parent Project */}
          <div style={{ marginBottom: '10px' }}>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--color-ink)',
                margin: '0 0 2px 0',
                lineHeight: 1.3,
              }}
            >
              {site.name}
            </h2>
            {parentProject && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--color-ink-muted)',
                }}
              >
                Parent Project:{' '}
                <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                  {parentProject.name}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            {canEdit && onEditSite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onEditSite(site);
                }}
                className="btn-primary"
                style={{
                  height: '28px',
                  fontSize: '11px',
                  padding: '0 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  backgroundColor: 'var(--color-emerald)',
                  borderColor: 'var(--color-emerald)',
                }}
                title={
                  currentUser?.role === 'admin'
                    ? 'Edit Conservation Site (Admin)'
                    : 'Edit Your Conservation Site'
                }
              >
                <Pencil size={12} /> Edit
              </button>
            )}

            {currentUser?.role === 'analyst' && !canEdit && (
              <div
                style={{
                  fontSize: '10px',
                  color: '#64748B',
                  backgroundColor: '#F1F5F9',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid #CBD5E1',
                }}
                title="Field analysts can only edit conservation sites they personally created"
              >
                <Lock size={11} /> Read-only
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setDigestModalOpen(true);
              }}
              className="btn-secondary"
              style={{
                height: '28px',
                fontSize: '11px',
                padding: '0 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
              title="Preview Email Alert Digest"
            >
              <Mail size={13} /> Digest
            </button>

            <button
              onClick={handleExportPDF}
              className="btn-secondary"
              style={{
                height: '28px',
                fontSize: '11px',
                padding: '0 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Export single-page executive PDF site report"
            >
              <Printer size={13} /> PDF Report
            </button>
          </div>

          {/* Panel Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--color-line)',
              gap: '12px',
              marginTop: '12px',
            }}
          >
            <button
              onClick={() => setActiveTab('overview')}
              style={{
                padding: '6px 0',
                border: 'none',
                borderBottom:
                  activeTab === 'overview'
                    ? '2px solid var(--color-ink)'
                    : '2px solid transparent',
                backgroundColor: 'transparent',
                fontWeight: activeTab === 'overview' ? 600 : 400,
                color:
                  activeTab === 'overview'
                    ? 'var(--color-ink)'
                    : 'var(--color-ink-muted)',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Info size={13} /> Overview
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              style={{
                padding: '6px 0',
                border: 'none',
                borderBottom:
                  activeTab === 'analytics'
                    ? '2px solid var(--color-ink)'
                    : '2px solid transparent',
                backgroundColor: 'transparent',
                fontWeight: activeTab === 'analytics' ? 600 : 400,
                color:
                  activeTab === 'analytics'
                    ? 'var(--color-ink)'
                    : 'var(--color-ink-muted)',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <LineChart size={13} /> Analytics
            </button>
            <button
              onClick={() => setActiveTab('assistant')}
              style={{
                padding: '6px 0',
                border: 'none',
                borderBottom:
                  activeTab === 'assistant'
                    ? '2px solid var(--color-ink)'
                    : '2px solid transparent',
                backgroundColor: 'transparent',
                fontWeight: activeTab === 'assistant' ? 600 : 400,
                color:
                  activeTab === 'assistant'
                    ? 'var(--color-ink)'
                    : 'var(--color-ink-muted)',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Sparkles size={13} className="text-emerald-600" /> Ask AI
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                padding: '6px 0',
                border: 'none',
                borderBottom:
                  activeTab === 'history'
                    ? '2px solid var(--color-ink)'
                    : '2px solid transparent',
                backgroundColor: 'transparent',
                fontWeight: activeTab === 'history' ? 600 : 400,
                color:
                  activeTab === 'history'
                    ? 'var(--color-ink)'
                    : 'var(--color-ink-muted)',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <History size={13} /> History
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div
          className="print:hidden"
          style={{
            padding: activeTab === 'assistant' ? '12px 14px 14px' : '20px',
            flex: 1,
            overflowY: activeTab === 'assistant' ? 'hidden' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {activeTab !== 'assistant' && <AlertBanner alerts={siteAlerts} />}

          {activeTab === 'overview' && (
            <div>
              {/* Metric Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '20px',
                }}
              >
                <div className="card-container" style={{ padding: '12px' }}>
                  <div
                    style={{
                      fontSize: '10px',
                      color: 'var(--color-ink-muted)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Surface Area
                  </div>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: '20px',
                      fontWeight: 600,
                      color: 'var(--color-ink)',
                      marginTop: '4px',
                    }}
                  >
                    {site.area_hectares != null
                      ? `${site.area_hectares} ha`
                      : 'Calc...'}
                  </div>
                </div>

                <div className="card-container" style={{ padding: '12px' }}>
                  <div
                    style={{
                      fontSize: '10px',
                      color: 'var(--color-ink-muted)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    Centroid Lat/Lng
                  </div>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--color-ink)',
                      marginTop: '6px',
                    }}
                  >
                    {centroidLat}° N, {centroidLng}° E
                  </div>
                </div>
              </div>

              {/* Geometry Info */}
              <div
                className="card-container"
                style={{ padding: '14px', marginBottom: '20px' }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-ink)',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Globe size={15} color="var(--color-teal)" /> Spatial Polygon
                  Metadata
                </div>
                <div style={{ fontSize: '12px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: '1px solid var(--color-line)',
                    }}
                  >
                    <span style={{ color: 'var(--color-ink-muted)' }}>
                      Geometry Type
                    </span>
                    <span className="font-mono" style={{ fontWeight: 500 }}>
                      GeoJSON Polygon
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: '1px solid var(--color-line)',
                    }}
                  >
                    <span style={{ color: 'var(--color-ink-muted)' }}>
                      SRID Reference
                    </span>
                    <span className="font-mono" style={{ fontWeight: 500 }}>
                      EPSG:4326 (WGS84)
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                    }}
                  >
                    <span style={{ color: 'var(--color-ink-muted)' }}>
                      Boundary Vertex Count
                    </span>
                    <span className="font-mono" style={{ fontWeight: 500 }}>
                      {vertexCount} vertices
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderTop: '1px solid var(--color-line)',
                    }}
                  >
                    <span style={{ color: 'var(--color-ink-muted)' }}>
                      Author / Origin
                    </span>
                    <span
                      className="font-mono"
                      style={{
                        fontWeight: 600,
                        color: isOwner ? '#059669' : '#0F172A',
                      }}
                    >
                      {site.created_by_id === 2
                        ? 'Field Analyst'
                        : site.created_by_id === 1
                          ? 'Operations Admin'
                          : parentProject?.name || 'GIS Console'}
                      {isOwner && currentUser?.role === 'analyst'
                        ? ' (You)'
                        : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Created Timestamp */}
              {site.created_at && (
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-ink-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '20px',
                  }}
                >
                  <Calendar size={13} />
                  Mapped on {new Date(site.created_at).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              {/* Time Series Chart */}
              <div style={{ marginBottom: '20px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '12px',
                      color: 'var(--color-ink)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <LineChart size={14} color="var(--color-teal)" />
                    {chartSectionTitle}
                  </div>

                  {(userRole === 'admin' || userRole === 'analyst') && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        alignItems: 'flex-end',
                      }}
                    >
                      {/* Primary action: Import CSV */}
                      <button
                        onClick={() => setCsvModalOpen(true)}
                        className="btn-canopy"
                        style={{
                          fontSize: '10px',
                          height: '24px',
                          padding: '0 9px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          borderRadius: '5px',
                          fontWeight: 600,
                          letterSpacing: '0.01em',
                          boxShadow: '0 1px 4px rgba(0,106,97,0.18)',
                        }}
                        title="Import historical or sensor time-series metrics from a CSV file"
                      >
                        <Upload size={10} />
                        Import CSV
                      </button>

                      {/* Divider + Demo-only actions — hidden on real-data sites */}
                      {isMockSite && (
                        <>
                          <div
                            style={{
                              width: '100%',
                              height: '1px',
                              backgroundColor: 'var(--color-line)',
                              margin: '1px 0',
                              opacity: 0.7,
                            }}
                          />

                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                              onClick={() => handleSeedMetrics(false)}
                              disabled={seeding}
                              className="btn-secondary"
                              style={{
                                fontSize: '10px',
                                height: '20px',
                                padding: '0 6px',
                                opacity: 0.75,
                              }}
                              title="Demo: Seed 12-month normal seasonal data"
                            >
                              <RefreshCw size={9} />
                              {seeding ? '...' : 'Seed Data'}
                            </button>
                            <button
                              onClick={() => handleSeedMetrics(true)}
                              disabled={seeding}
                              className="btn-danger"
                              style={{
                                fontSize: '10px',
                                height: '20px',
                                padding: '0 6px',
                                opacity: 0.75,
                              }}
                              title="Demo: Inject >10% degradation drop"
                            >
                              Simulate Drop
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {loading ? (
                  <div
                    style={{
                      padding: '24px',
                      textAlign: 'center',
                      fontSize: '12px',
                      color: 'var(--color-ink-muted)',
                    }}
                  >
                    Loading telemetry metrics...
                  </div>
                ) : (
                  <SiteMetricsChart metrics={metrics} />
                )}
              </div>
            </div>
          )}

          {/* AI Assistant Tab */}
          {activeTab === 'assistant' &&
            (isChatEnlarged ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  padding: '36px 20px',
                  backgroundColor: '#F8FAFC',
                  border: '1px dashed #CBD5E1',
                  borderRadius: '12px',
                  textAlign: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    backgroundColor: '#ECFDF5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#059669',
                    border: '1px solid #A7F3D0',
                    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.15)',
                  }}
                >
                  <Maximize2 size={22} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#0F172A',
                    }}
                  >
                    Chatbot is Enlarged
                  </div>
                  <div
                    style={{
                      fontSize: '11.5px',
                      color: '#64748B',
                      marginTop: '4px',
                      maxWidth: '240px',
                      lineHeight: '1.4',
                    }}
                  >
                    The AI Assistant is currently active in centered modal view
                    with background blur.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChatEnlarged(false)}
                  className="chat-chip-spring"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    backgroundColor: '#FFFFFF',
                    color: '#059669',
                    border: '1px solid #059669',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  <Minimize2 size={13} />
                  <span>Restore to Drawer</span>
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: 0,
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  backgroundColor: '#F8FAFC',
                  boxShadow: '0 4px 18px rgba(15, 23, 42, 0.05)',
                  overflow: 'hidden',
                }}
              >
                {renderChatInterface(false)}
              </div>
            ))}

          {activeTab === 'history' && (
            <div>
              <div
                className="card-container"
                style={{ padding: '14px', fontSize: '12px' }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: 'var(--color-ink)',
                    marginBottom: '8px',
                  }}
                >
                  Audit History Trail
                </div>
                <p
                  style={{
                    color: 'var(--color-ink-muted)',
                    fontSize: '11px',
                    lineHeight: '1.4',
                  }}
                >
                  All polygon boundary edits, metric ingestions, and telemetry
                  updates are logged automatically via SQLAlchemy event
                  listeners.
                </p>
              </div>
            </div>
          )}

          {/* Delete Action (Admin or Site Creator Analyst) */}
          {(userRole === 'admin' || (userRole === 'analyst' && isOwner)) && (
            <div
              style={{
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid var(--color-line)',
              }}
            >
              <button
                onClick={() => onDeleteSite(site.id)}
                className="btn-danger print:hidden"
                style={{ width: '100%', height: '32px' }}
              >
                <Trash2 size={13} />
                Delete Conservation Site
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alert Digest Email Preview Modal */}
      <AlertDigestModal
        site={site}
        alerts={siteAlerts}
        isOpen={digestModalOpen}
        onClose={() => setDigestModalOpen(false)}
      />

      {/* Import CSV Modal */}
      <ImportMetricsModal
        site={site}
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onSuccess={() => {
          if (site?.id) {
            loadSiteMetricsAndAlerts(site.id);
          }
        }}
      />

      {/* Enlarged Centered AI Chatbot Modal with Blurred Backdrop */}
      {isChatEnlarged &&
        createPortal(
          <div
            className="chat-modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 99999,
              backgroundColor: 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              boxSizing: 'border-box',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsChatEnlarged(false);
              }
            }}
          >
            <div
              className="chat-modal-window"
              style={{
                width: 'min(940px, 95vw)',
                height: 'min(840px, 90vh)',
                backgroundColor: '#F8FAFC',
                borderRadius: '16px',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                boxShadow:
                  '0 25px 60px -12px rgba(15, 23, 42, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {renderChatInterface(true)}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
