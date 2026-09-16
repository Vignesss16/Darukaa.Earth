export type UserRole = 'admin' | 'analyst' | 'viewer';
export type ProjectStatus = 'active' | 'archived';
export type SiteType = 'carbon' | 'biodiversity' | 'mixed';
export type MetricType =
  'ndvi' | 'canopy_cover' | 'carbon_tons' | 'biodiversity_index';

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
