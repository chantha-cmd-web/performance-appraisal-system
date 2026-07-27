const rawUrl: string = (import.meta as any).env?.VITE_API_URL || '';

export const API_BASE_URL: string = (rawUrl || '').replace(/\/+$/, '');

export function apiUrl(path: string): string {
  if (API_BASE_URL) return `${API_BASE_URL}${path}`;
  return path;
}

export function wsUrl(path: string): string {
  if (API_BASE_URL) {
    return `${API_BASE_URL.replace(/^http/, 'ws')}${path}`;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${path}`;
}
