import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { useAuthStore } from '@/store/auth.store';

/**
 * Axios instance shared by all `services/`.
 *
 * Conventions (per ADR-004 — REST API design):
 *  - Base URL from VITE_API_URL, version-prefixed (/api/v1)
 *  - Access token injected from the auth store (Zustand, in-memory)
 *  - 401 triggers a silent refresh; refresh failure logs the user out
 *  - All responses follow { status, data } | { status, message, code } envelope
 *
 * The refresh logic itself is stubbed until the backend lands in Phase 1.4.
 * MSW handlers can simulate 401 + refresh for tests once the screens exist.
 */

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true, // for httpOnly refresh cookie (ADR-002)
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: inject access token ──
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: silent refresh on 401 ──
let refreshPromise: Promise<string | null> | null = null;

async function attemptRefresh(): Promise<string | null> {
  // Placeholder. Real implementation in Phase 1.4 once /auth/refresh exists.
  // For now, return null → caller treats as unauthenticated.
  return null;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      refreshPromise ??= attemptRefresh().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;

      if (newToken) {
        useAuthStore.getState().setAccessToken(newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }

      // Refresh failed — log out.
      useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  },
);

// ── Shared response envelope types (mirror ADR-004) ──
export type ApiSuccess<T> = { status: 'success'; data: T };
export type ApiSuccessList<T> = {
  status: 'success';
  data: T[];
  meta: { total: number; page: number; pageSize: number; pageCount: number };
};
export type ApiError = { status: 'error'; message: string; code: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
