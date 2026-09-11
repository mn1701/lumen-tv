import type { Entry, Progress, Session, Ticket, HistoryPolicy, Playlist } from './types';
export class APIError extends Error { constructor(message: string, public status: number) { super(message); } }
export class Companion {
  constructor(public session: Session) {}
  private async request<T>(path: string, options: RequestInit = {}, signal?: AbortSignal): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    try {
      const response = await fetch(this.session.baseURL + path, {
        ...options, signal: controller.signal,
        headers: { 'Authorization': `Bearer ${this.session.token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: response.statusText }));
        throw new APIError(data.error || 'Companion request failed', response.status);
      }
      return response.status === 204 ? undefined as T : await response.json() as T;
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }
  async catalog(signal?: AbortSignal): Promise<Entry[]> {
    const result = await this.request<{ version: number; entries: Entry[] }>('/api/catalog', {}, signal);
    if (result.version !== 1 || !Array.isArray(result.entries)) throw new Error('Unsupported companion catalog.');
    return result.entries;
  }
  progress(signal?: AbortSignal) { return this.request<Record<string, Progress>>('/api/progress', {}, signal); }
  ticket(id: string, signal?: AbortSignal) { return this.request<Ticket>(`/api/media/${encodeURIComponent(id)}/ticket`, { method: 'POST' }, signal); }
  saveProgress(id: string, position: number, duration: number) {
    return this.request<void>(`/api/progress/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ position, duration }) });
  }
  privacy(signal?: AbortSignal) { return this.request<HistoryPolicy>('/api/privacy', {}, signal); }
  savePrivacy(value: HistoryPolicy) { return this.request<HistoryPolicy>('/api/privacy', { method: 'PUT', body: JSON.stringify(value) }); }
  clearHistory() { return this.request<void>('/api/progress', { method: 'DELETE' }); }
  exportData() { return this.request<unknown>('/api/export'); }
  playlists(signal?: AbortSignal) { return this.request<Playlist[]>('/api/playlists', {}, signal); }
  savePlaylist(value: Pick<Playlist, 'id' | 'name' | 'entries' | 'version'>) { return this.request<Playlist>('/api/playlists', { method: 'PUT', body: JSON.stringify(value) }); }
  deletePlaylist(id: string) { return this.request<void>(`/api/playlists/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
  revoke() { return this.request<void>('/api/session', { method: 'DELETE' }); }
}
export async function pair(baseURL: string, name: string, code: string): Promise<Session> {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(baseURL + '/api/pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, code }), signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new APIError(data.error || 'Pairing failed', response.status);
    if (typeof data.token !== 'string' || typeof data.deviceId !== 'string' || typeof data.expires !== 'number') throw new Error('Invalid pairing response.');
    return { baseURL, ...data };
  } finally { clearTimeout(timer); }
}
