// Password reset + admin account management (Django backend, see BACKEND_AUTH.md).
//   POST /api/auth/password-reset/            { email }            -> 200 always (no account enumeration)
//   POST /api/auth/password-reset/confirm/    { uid, token, new_password }
//   POST /api/auth/change-password/           { current_password, new_password }
//   GET  /api/auth/users/                     admin only
//   POST /api/auth/users/<id>/force-reset/    admin only { new_password } -> sets must_change_password
//   POST /api/auth/users/<id>/lock/ | unlock/ admin only

import { api, API_URL, ApiError } from './api';
import { safeList } from './finance-api';

async function publicPost(path: string, body: unknown) {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, `Cannot reach the backend at ${API_URL}. Is the Django server running?`);
  }
  const data = await res.json().catch(() => undefined);
  if (!res.ok) {
    const msg = data?.detail || data?.error || (data && Object.values(data).flat()[0]) || 'Request failed.';
    throw new ApiError(res.status, String(msg), data);
  }
  return data;
}

export const requestPasswordReset = (email: string) =>
  publicPost('/api/auth/password-reset/', { email, reset_url: `${window.location.origin}/reset-password` });

export const confirmPasswordReset = (uid: string, token: string, new_password: string) =>
  publicPost('/api/auth/password-reset/confirm/', { uid, token, new_password });

export const changePassword = (current_password: string, new_password: string) =>
  api.post('/api/auth/change-password/', { current_password, new_password });

export interface AccountUser {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  is_active: boolean;
  is_locked?: boolean;
  must_change_password?: boolean;
  last_login?: string | null;
  password_changed_at?: string | null;
}

export const listUsers = () => safeList<AccountUser>('/api/auth/users/?limit=1000');
export const forceResetPassword = (id: number, new_password: string) =>
  api.post(`/api/auth/users/${id}/force-reset/`, { new_password });
export const lockUser = (id: number) => api.post(`/api/auth/users/${id}/lock/`, {});
export const unlockUser = (id: number) => api.post(`/api/auth/users/${id}/unlock/`, {});

export function passwordProblem(p: string): string | null {
  if (p.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Use both letters and numbers.';
  return null;
}
