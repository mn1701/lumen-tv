import type { Session } from './types';
import { localPrivacy } from './privacy';
const KEY = 'lumen.session.v1';
export function normalizeBase(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Enter an HTTP or HTTPS companion origin without a path.');
  }
  return url.origin;
}
export function loadSession(): Session | null {
  if (!localPrivacy().rememberSession) return null;
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null') as Session | null;
    if (!value || typeof value.token !== 'string' || value.token.length < 32 || typeof value.deviceId !== 'string' || value.expires <= Date.now() / 1000) return null;
    return { ...value, baseURL: normalizeBase(value.baseURL) };
  } catch { return null; }
}
export function saveSession(value: Session | null) {
  if (value && localPrivacy().rememberSession) localStorage.setItem(KEY, JSON.stringify(value));
  else localStorage.removeItem(KEY);
}
