import {
  ActivityLogItem,
  DegradationAlert,
  GeoJSONPolygon,
  Project,
  Site,
  SiteMetric,
  TokenResponse,
  User,
} from './types';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export function getStoredTokens(): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  return {
    accessToken: localStorage.getItem('darukaa_access_token'),
    refreshToken: localStorage.getItem('darukaa_refresh_token'),
  };
}

export function setStoredTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('darukaa_access_token', accessToken);
  localStorage.setItem('darukaa_refresh_token', refreshToken);
}

export function clearStoredTokens() {
  localStorage.removeItem('darukaa_access_token');
  localStorage.removeItem('darukaa_refresh_token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken } = getStoredTokens();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (
    response.status === 401 &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/refresh')
  ) {
    const { refreshToken } = getStoredTokens();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshRes.ok) {
          const newTokens: TokenResponse = await refreshRes.json();
          setStoredTokens(newTokens.access_token, newTokens.refresh_token);
          headers['Authorization'] = `Bearer ${newTokens.access_token}`;
          const retryRes = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
          });
          if (!retryRes.ok) {
            const errData = await retryRes
              .json()
              .catch(() => ({ detail: 'Request failed' }));
            throw new Error(errData.detail || `HTTP Error ${retryRes.status}`);
          }
          return retryRes.json();
        }
      } catch {
        clearStoredTokens();
        window.location.reload();
      }
    }
  }

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: 'Network request failed' }));
    const message = Array.isArray(errorData.detail)
      ? errorData.detail
          .map((e: { msg?: string }) => e.msg || String(e))
          .join(', ')
      : errorData.detail || `HTTP Error ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<TokenResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (
      email: string,
      password: string,
      full_name: string,
      role = 'viewer'
    ) =>
      request<User>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name, role }),
      }),
    me: () => request<User>('/auth/me'),
  },
  projects: {
    list: (status?: string) =>
      request<Project[]>(`/projects${status ? `?status=${status}` : ''}`),
    create: (data: { name: string; description?: string; status?: string }) =>
      request<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    get: (id: number) => request<Project>(`/projects/${id}`),
    update: (id: number, data: Partial<Project>) =>
      request<Project>(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/projects/${id}`, {
        method: 'DELETE',
      }),
  },
  sites: {
    list: (projectId?: number, siteType?: string) => {
      const params = new URLSearchParams();
      if (projectId) params.append('project_id', projectId.toString());
      if (siteType) params.append('site_type', siteType);
      const query = params.toString();
      return request<Site[]>(`/sites${query ? `?${query}` : ''}`);
    },
    create: (data: {
      project_id: number;
      name: string;
      site_type: string;
      geojson: GeoJSONPolygon;
    }) =>
      request<Site>('/sites', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    get: (id: number) => request<Site>(`/sites/${id}`),
    update: (id: number, data: Partial<Site>) =>
      request<Site>(`/sites/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/sites/${id}`, {
        method: 'DELETE',
      }),
  },
  metrics: {
    get: (siteId: number, metricType?: string) =>
      request<SiteMetric[]>(
        `/sites/${siteId}/metrics${metricType ? `?metric_type=${metricType}` : ''}`
      ),
    seed: (siteId: number, includeSpike = false) =>
      request<SiteMetric[]>(
        `/sites/${siteId}/seed-metrics?include_spike=${includeSpike}`,
        {
          method: 'POST',
        }
      ),
  },
  alerts: {
    list: (siteId?: number) =>
      request<DegradationAlert[]>(
        `/alerts${siteId ? `?site_id=${siteId}` : ''}`
      ),
  },
  activity: {
    list: (limit = 50) =>
      request<ActivityLogItem[]>(`/activity?limit=${limit}`),
  },
};
