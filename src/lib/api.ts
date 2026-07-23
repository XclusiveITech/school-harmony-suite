// Lightweight API client for the Django backend.
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
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export async function apiFetch<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  const access = tokens.access;
  if (access) headers.set('Authorization', `Bearer ${access}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : (res.text() as any);
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  // SimpleJWT default endpoint. Accepts `username` or `email` depending on backend config;
  // we send both for compatibility.
  const res = await fetch(`${API_URL}/api/auth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: email, email, password }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Invalid credentials');
  }
  return res.json();
}

export async function fetchMe() {
  // Try common "current user" endpoints; return the first that works.
  const candidates = ['/api/auth/me/', '/api/core/users/me/', '/api/users/me/'];
  for (const path of candidates) {
    try {
      return await apiFetch(path);
    } catch {
      /* try next */
    }
  }
  return null;
}
