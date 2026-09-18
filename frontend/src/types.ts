export type UserRole = 'admin' | 'analyst' | 'viewer';
export type ProjectStatus = 'active' | 'archived';
export type SiteType = 'carbon' | 'biodiversity' | 'mixed';
export type MetricType =
  | 'ndvi'
  | 'canopy_cover'
  | 'carbon_tons'
  | 'biodiversity_index'
  | 'deforestation_area_km2'
  | 'fire_incidents';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  created_at?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  status: ProjectStatus;
  created_at?: string;
  site_count?: number;
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface Site {
  id: number;
  project_id: number;
  name: string;
  area_hectares?: number;
  site_type: SiteType;
  geojson: GeoJSONPolygon;
  created_at?: string;
  created_by_id?: number;
}

export interface SiteMetric {
  id: number;
  site_id: number;
  metric_type: MetricType;
  value: number;
  recorded_at: string;
  source: string;
}

export interface DegradationAlert {
  site_id: number;
  site_name: string;
  project_id: number;
  metric_type: string;
  previous_value: number;
  current_value: number;
  drop_percentage: number;
  recorded_at: string;
  previous_date: string;
  message: string;
  severity: string;
}

export interface ActivityLogItem {
  id: number;
  user_id: number | null;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  diff: Record<string, unknown>;
  sentence: string;
  created_at: string;
}

export interface BulkImportResponse {
  created_count: number;
  sites: Site[];
  message: string;
}

export interface SiteCompareResult {
  site_ids: number[];
  sites: Site[];
  metrics_by_site: Record<number, SiteMetric[]>;
  active_alert_counts: Record<number, number>;
}

export interface ProjectSummarySiteItem {
  site_id?: number;
  id?: number;
  name: string;
  site_type: string;
  area_hectares: number;
  active_alert_count?: number;
  alert_count?: number;
  latest_canopy_cover: number | null;
  latest_ndvi?: number | null;
  health_status?: string;
}

export interface ProjectSummaryResult {
  project_id: number;
  project_name: string;
  description?: string;
  status?: string;
  total_sites: number;
  total_area_hectares: number;
  total_active_alerts: number;
  sites_by_classification?: Record<string, number>;
  site_type_counts?: Record<string, number>;
  site_summaries?: ProjectSummarySiteItem[];
  sites?: ProjectSummarySiteItem[];
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantChatResponse {
  response: string;
  site_id: number;
  site_name: string;
  is_ai_generated: boolean;
}
