export type UserRole = 'admin' | 'analyst' | 'viewer';
export type ProjectStatus = 'active' | 'archived';
export type SiteType = 'carbon' | 'biodiversity' | 'mixed';

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
