export type AppID = 'clock' | 'focus' | 'scratchpad' | 'playlists' | 'privacy';
export interface AppDefinition { id: AppID; title: string; description: string; network: boolean }
// Built-ins are compiled modules. The catalog cannot inject executable JavaScript or remote frames.
export const applications: AppDefinition[] = [
  { id: 'clock', title: 'Clock', description: 'A clean room clock.', network: false },
  { id: 'focus', title: 'Focus timer', description: 'Work and rest intervals with pause and resume.', network: false },
  { id: 'scratchpad', title: 'Locked scratchpad', description: 'Password-encrypted notes stored on this display.', network: false },
  { id: 'playlists', title: 'Playlists', description: 'Curate local music and video collections.', network: true },
  { id: 'privacy', title: 'Privacy center', description: 'Control storage, resume history, and device exports.', network: true },
];
