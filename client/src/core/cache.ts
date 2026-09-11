import type { Entry } from './types';
import { localPrivacy } from './privacy';
const KEY = 'lumen.catalog.v1';
export function saveCatalog(origin: string, entries: Entry[]) {
  if (!localPrivacy().cacheCatalog) return;
  try { localStorage.setItem(KEY, JSON.stringify({ origin, entries, saved: Date.now() })); } catch { /* Storage is optional for browsing. */ }
}
export function cachedCatalog(origin: string): Entry[] {
  if (!localPrivacy().cacheCatalog) return [];
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (value?.origin !== origin || !Array.isArray(value.entries) || Date.now() - value.saved > 7 * 86400000) return [];
    return value.entries.slice(0, 1000).filter((entry: Entry) => typeof entry.id === 'string' && typeof entry.title === 'string' && ['video', 'audio', 'image', 'native'].includes(entry.kind));
  } catch { return []; }
}
export function loadFavorites(): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem('lumen.favorites.v1') || '[]'); return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').slice(0, 1000) : []; }
  catch { return []; }
}
export function saveFavorites(ids: string[]) { try { localStorage.setItem('lumen.favorites.v1', JSON.stringify(ids)); } catch {} }
