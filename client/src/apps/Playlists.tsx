import { useEffect, useState } from 'react';
import type { Companion } from '../core/api';
import type { Entry, Playlist } from '../core/types';
export function Playlists({ api, entries, open, onClose }: { api: Companion; entries: Entry[]; open(entry: Entry): void; onClose(): void }) {
  const [lists, setLists] = useState<Playlist[]>([]), [name, setName] = useState(''), [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<Playlist | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { const abort = new AbortController(); api.playlists(abort.signal).then(setLists).catch(e => { if (!abort.signal.aborted) setError(String(e)); }); return () => abort.abort(); }, [api]);
  async function save() {
    setBusy(true); setError('');
    try {
      await api.savePlaylist({ id: editing?.id || '', name, entries: selected, version: editing?.version || 0 });
      setLists(await api.playlists()); setName(''); setSelected([]); setEditing(null);
    } catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  async function remove(id: string) { setBusy(true); try { await api.deletePlaylist(id); setLists(await api.playlists()); } catch (e) { setError(String(e)); } finally { setBusy(false); } }
  return <section className="utility"><h1>Playlists</h1><p>Saved separately for this paired display.</p>
    <label>Name<input data-focus maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
    <div className="select-media">{entries.filter(e => e.kind === 'video' || e.kind === 'audio').map(entry => <button data-focus key={entry.id} aria-pressed={selected.includes(entry.id)} onClick={() => setSelected(ids => ids.includes(entry.id) ? ids.filter(id => id !== entry.id) : [...ids, entry.id])}>{entry.title}</button>)}</div>
    <div className="toolbar"><button data-focus disabled={busy || !name.trim()} onClick={() => { void save(); }}>Save playlist</button><button data-focus onClick={() => { setEditing(null); setName(''); setSelected([]); }}>New playlist</button><button data-focus onClick={onClose}>Close</button></div>
    {lists.map(list => <article className="playlist" key={list.id}><h2>{list.name}</h2><div className="toolbar">
      <button data-focus onClick={() => { setEditing(list); setName(list.name); setSelected(list.entries); }}>Edit</button><button data-focus disabled={busy} onClick={() => { void remove(list.id); }}>Delete</button>
      {list.entries.map((id, index) => { const entry = entries.find(e => e.id === id); return entry ? <button data-focus key={`${id}-${index}`} onClick={() => open(entry)}>{index + 1}. {entry.title}</button> : <span key={index}>Unavailable item</span>; })}
    </div></article>)}{error && <p role="alert">{error}</p>}
  </section>;
}
