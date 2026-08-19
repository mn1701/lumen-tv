export type EntryKind = 'video' | 'audio' | 'image' | 'native';
export interface Entry {
  id: string;
  title: string;
  kind: EntryKind;
  collection: string;
  description: string;
  appId?: string;
  mime?: string;
  duration?: number;
}
export interface Progress { position: number; duration: number; updated: number }
export interface Session { baseURL: string; token: string; deviceId: string; expires: number }
export interface Ticket { path: string; expires: number }
export type PlaybackState = 'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'ended' | 'failed';

export interface HistoryPolicy { recordHistory: boolean; retentionDays: number }
export interface Playlist { id: string; name: string; entries: string[]; version: number; updated: number }
