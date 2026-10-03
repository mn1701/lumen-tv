import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIError, Companion } from './core/api';
import { cachedCatalog, loadFavorites, saveCatalog, saveFavorites } from './core/cache';
import { focusFirst, installNavigation } from './core/focus';
import { loadSession, saveSession } from './core/session';
import type { Entry, Progress, Session } from './core/types';
import { CatalogGrid } from './components/CatalogGrid';
import { Clock } from './features/Clock';
import { Gallery } from './features/Gallery';
import { Pairing } from './features/Pairing';
import { Player } from './features/Player';
import { exitToPlatform, isBack, launchInstalled } from './platform/webos';
import { applications, type AppID } from './apps/registry';
import { FocusTimer } from './apps/FocusTimer';
import { Scratchpad } from './apps/Scratchpad';
import { Playlists } from './apps/Playlists';
import { PrivacyCenter } from './features/privacy/PrivacyCenter';
import { localPrivacy } from './core/privacy';
import './styles.css';
type Route = { page: 'home' | AppID } | { page: 'player' | 'gallery'; entry: Entry };
export function App() {
  const [localSettings, setLocalSettings] = useState(localPrivacy);
  const [session, setSession] = useState<Session | null>(loadSession);
  const api = useMemo(() => session ? new Companion(session) : null, [session]);
  const [entries, setEntries] = useState<Entry[]>([]); const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [route, setRoute] = useState<Route>({ page: 'home' }); const [filter, setFilter] = useState('all');
  const [favorites, setFavorites] = useState<string[]>(loadFavorites); const [error, setError] = useState('');
  const [status, setStatus] = useState('Not paired'); const [refresh, setRefresh] = useState(0);
  const root = useRef<HTMLDivElement>(null); const remembered = useRef<string>('');
  const home = useCallback(() => { setRoute({ page: 'home' }); setRefresh(n => n + 1); }, []);
  useEffect(() => root.current ? installNavigation(root.current) : undefined, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (route.page === 'home' && remembered.current) {
        const node = document.getElementById(remembered.current); if (node) { node.focus(); return; }
      }
      if (root.current) focusFirst(root.current.querySelector<HTMLElement>('.player, .gallery, .clock, .utility') || root.current);
    }, 0);
    return () => clearTimeout(timer);
  }, [route.page, session, filter, entries.length]);
  useEffect(() => {
    function back(event: KeyboardEvent) {
      if (event.defaultPrevented || !isBack(event)) return;
      if (route.page !== 'home') { event.preventDefault(); home(); }
      else { event.preventDefault(); exitToPlatform(); }
    }
    document.addEventListener('keydown', back);
    return () => document.removeEventListener('keydown', back);
  }, [route.page, home]);
  useEffect(() => {
    const online = () => setRefresh(n => n + 1); window.addEventListener('online', online); return () => window.removeEventListener('online', online);
  }, []);
  useEffect(() => {
    if (!api) { setEntries([]); setProgress({}); setStatus('Not paired'); return; }
    const controller = new AbortController(); setStatus('Connecting');
    api.catalog(controller.signal).then(result => {
      if (controller.signal.aborted) return; setEntries(result); saveCatalog(api.session.baseURL, result); setStatus('Connected'); setError('');
    }).catch(e => {
      if (controller.signal.aborted) return;
      if (e instanceof APIError && e.status === 401) { saveSession(null); setSession(null); setError('Display session expired. Pair again.'); return; }
      setEntries(cachedCatalog(api.session.baseURL)); setStatus('Cached library'); setError(String(e));
    });
    api.progress(controller.signal).then(result => { if (!controller.signal.aborted) setProgress(result); }).catch(() => {});
    return () => controller.abort();
  }, [api, refresh]);
  function preferencesChanged() { setLocalSettings(localPrivacy()); setFavorites(loadFavorites()); setRefresh(n => n + 1); }
  function paired(value: Session) { saveSession(value); setSession(value); setError(''); }
  function favorite(id: string) { setFavorites(previous => { const next = previous.includes(id) ? previous.filter(v => v !== id) : [...previous, id].slice(-1000); saveFavorites(next); return next; }); }
  async function open(entry: Entry) {
    const focused = document.activeElement as HTMLElement | null; remembered.current = focused?.id || '';
    if (entry.kind === 'native') {
      try { await launchInstalled(entry.appId || ''); } catch (e) { setError(String(e)); }
    } else setRoute({ page: entry.kind === 'image' ? 'gallery' : 'player', entry });
  }
  async function disconnect() {
    if (api) {
      try { await api.revoke(); }
      catch (e) { setError('Could not revoke the companion session: ' + String(e)); return; }
    }
    saveSession(null); setSession(null); setRoute({ page: 'home' });
  }
  const shown = entries.filter(entry => filter === 'all' || (filter === 'saved' ? favorites.includes(entry.id) : filter === 'continue' ? progress[entry.id]?.position > 0 && progress[entry.id].position < progress[entry.id].duration * 0.95 : entry.kind === filter));
  return <div className={`shell ${localSettings.hideDescriptions ? 'private-titles' : ''}`} ref={root}><header><span className="brand">LUMEN<span>TV</span></span><div className="header-right"><span className="status">{status}</span>{api && <button data-focus onClick={disconnect}>Unpair</button>}</div></header>
    {!api ? <Pairing onPaired={paired} /> : route.page === 'player' ? <Player key={route.entry.id} api={api} entry={route.entry} resume={progress[route.entry.id]} onClose={home} /> : route.page === 'gallery' ? <Gallery items={entries.filter(entry => entry.kind === 'image')} initial={route.entry.id} api={api} onClose={home} /> : route.page === 'clock' ? <Clock onClose={home} /> : route.page === 'focus' ? <FocusTimer onClose={home} /> : route.page === 'scratchpad' ? <Scratchpad onClose={home} /> : route.page === 'playlists' ? <Playlists api={api} entries={entries} open={entry => { void open(entry); }} onClose={home} /> : route.page === 'privacy' ? <PrivacyCenter api={api} onChange={preferencesChanged} onClose={home} /> : <main>
      <section className="hero"><div><span className="eyebrow">YOUR COMPANION LIBRARY</span><h1>A quieter way to watch.</h1><p>Local media, familiar apps, and room to breathe.</p></div><div className="toolbar"><button data-focus onClick={() => setRoute({ page: 'clock' })}>Clock</button><button data-focus onClick={() => setRefresh(n => n + 1)}>Refresh library</button></div></section>
      <section className="application-dock" aria-label="Built-in applications">{applications.map(app => <button data-focus key={app.id} onClick={() => setRoute({ page: app.id })}><strong>{app.title}</strong><span>{app.description}</span></button>)}</section>
      <nav aria-label="Library categories">{[['all', 'Everything'], ['continue', 'Continue'], ['saved', 'Saved'], ['video', 'Video'], ['audio', 'Music'], ['image', 'Photos'], ['native', 'Apps']].map(([value, label]) => <button data-focus key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</nav>
      <CatalogGrid entries={shown} progress={progress} favorites={favorites} toggleFavorite={favorite} open={entry => { void open(entry); }} />
      {!shown.length && <section className="empty"><h2>No items in this view</h2><p>Add local media to the companion catalog, or select another category.</p></section>}
      <footer><span>{entries.length} catalog items</span><span>Arrow keys to move · Enter to select · Back to return</span></footer>
    </main>}{error && <aside className="error" role="alert"><span>{error}</span><button data-focus onClick={() => setError('')}>Dismiss</button></aside>}
  </div>;
}
