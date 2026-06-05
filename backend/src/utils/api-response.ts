/**
 * Standard API response envelope helpers — per ADR-004.
 *
 *   success(data)            → { status: 'success', data }
 *   successList(data, meta)  → { status: 'success', data, meta }
 *   error(message, code)     → { status: 'error', message, code }
 *
 * Controllers use these so we never hand-roll an envelope (and forget
 * a field, drift across endpoints, etc.).
 */

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export function success<T>(data: T) {
  return { status: 'success' as const, data };
}

export function successList<T>(data: T[], meta: PaginationMeta) {
  return { status: 'success' as const, data, meta };
}

export function errorEnvelope(message: string, code: string, details?: unknown) {
  return details === undefined
    ? { status: 'error' as const, message, code }
    : { status: 'error' as const, message, code, details };
}
