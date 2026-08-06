// API client for the Brainstar Django backend (DRF + SimpleJWT).
// Configure the base URL via VITE_API_URL (defaults to http://localhost:8000).

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:8000';

const ACCESS_KEY = 'brainstar_access';
const REFRESH_KEY = 'brainstar_refresh';

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh?: string | null) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function parseBody(res: Response) {
  const ct = res.headers.get('content-type') || '';
  if (res.status === 204) return undefined;
  if (ct.includes('application/json')) return res.json().catch(() => undefined);
  return res.text().catch(() => '');
}

function messageFrom(body: any, fallback: string) {
  if (!body) return fallback;
  if (typeof body === 'string') return body.slice(0, 300) || fallback;
  return (
    body.detail ||
    body.error ||
    (Array.isArray(body.non_field_errors) ? body.non_field_errors[0] : null) ||
    fallback
  );
}

/** Exchange the stored refresh token for a fresh access token. */
export async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokens.refresh;
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.access) {
      tokens.set(data.access, data.refresh);
      return data.access as string;
    }
  } catch {
    /* network error */
  }
  return null;
}

export async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const call = async (accessToken: string | null) => {
    const headers = new Headers(init.headers || {});
    if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(`${API_URL}${path}`, { ...init, headers });
  };

  let res: Response;
  try {
    res = await call(tokens.access);
  } catch {
    throw new ApiError(0, `Cannot reach the backend at ${API_URL}. Is the Django server running?`);
  }

  // Access token expired -> try one silent refresh, then retry the request.
  if (res.status === 401 && tokens.refresh) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      res = await call(fresh);
    }
  }

  const body = await parseBody(res);
  if (!res.ok) throw new ApiError(res.status, messageFrom(body, `${res.status} ${res.statusText}`), body);
  return body as T;
}

export const api = {
  get: <T = any>(path: string) => apiFetch<T>(path),
  post: <T = any>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) }),
  patch: <T = any>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  put: <T = any>(path: string, data?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T = any>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

export interface BackendUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  must_change_password?: boolean;
  is_locked?: boolean;
  branch?: number | null;
  branch_name?: string | null;
  roles?: string[];
  role?: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user?: BackendUser;
}

/**
 * POST /api/auth/token/ — the backend accepts either an email address or a
 * username in the `email` field (see EmailOrUsernameTokenView).
 */
export async function loginRequest(identifier: string, password: string): Promise<LoginResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: identifier, username: identifier, password }),
    });
  } catch {
    throw new ApiError(0, `Cannot reach the backend at ${API_URL}. Is the Django server running?`);
  }
  const body = await parseBody(res);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      messageFrom(body, res.status === 401 ? 'Invalid email or password.' : 'Login failed.'),
      body,
    );
  }
  return body as LoginResponse;
}

/** GET /api/auth/me/ — current user; falls back to legacy paths if needed. */
export async function fetchMe(): Promise<BackendUser | null> {
  const candidates = ['/api/auth/me/', '/api/core/users/me/', '/api/users/me/'];
  for (const path of candidates) {
    try {
      return await apiFetch<BackendUser>(path);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) throw e;
    }
  }
  return null;
}

/** Simple connectivity probe used by the login screen. */
export async function pingBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/health/`);
    return res.ok;
  } catch {
    return false;
  }
}
