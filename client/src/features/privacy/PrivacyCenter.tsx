import { useEffect, useState } from 'react';
import type { Companion } from '../../core/api';
import { eraseLocalData, localPrivacy, setLocalPrivacy } from '../../core/privacy';
import { saveSession } from '../../core/session';
import type { HistoryPolicy } from '../../core/types';
export function PrivacyCenter({ api, onChange, onClose }: { api: Companion; onChange(): void; onClose(): void }) {
  const [policy, setPolicy] = useState<HistoryPolicy>({ recordHistory: true, retentionDays: 30 }), [local, setLocal] = useState(localPrivacy);
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { const abort = new AbortController(); api.privacy(abort.signal).then(value => { setPolicy(value); setReady(true); }).catch(e => { if (!abort.signal.aborted) setError(String(e)); }); return () => abort.abort(); }, [api]);
  async function save() {
    setBusy(true); setError('');
    try { await api.savePrivacy(policy); setLocalPrivacy(local); saveSession(api.session); setNotice('Privacy choices saved'); onChange(); }
    catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  async function clear() { try { await api.clearHistory(); setNotice('Companion history erased'); onChange(); } catch (e) { setError(String(e)); } }
  async function exportData() {
    try {
      const data = await api.exportData(); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'lumen-display-export.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('Export requested. Download behavior depends on the TV browser.');
    } catch (e) { setError(String(e)); }
  }
  return <section className="utility"><span className="eyebrow">THIS DISPLAY</span><h1>Privacy center</h1>
    <label className="choice"><input data-focus type="checkbox" checked={policy.recordHistory} onChange={e => setPolicy(p => ({ ...p, recordHistory: e.target.checked }))} />Keep playback history</label>
    <label>History retention in days<input data-focus type="number" min={1} max={90} value={policy.retentionDays} onChange={e => setPolicy(p => ({ ...p, retentionDays: Number(e.target.value) }))} /></label>
    <label className="choice"><input data-focus type="checkbox" checked={local.rememberSession} onChange={e => setLocal(p => ({ ...p, rememberSession: e.target.checked }))} />Remember pairing after restart</label>
    <label className="choice"><input data-focus type="checkbox" checked={local.cacheCatalog} onChange={e => setLocal(p => ({ ...p, cacheCatalog: e.target.checked }))} />Cache catalog titles on this display</label>
    <label className="choice"><input data-focus type="checkbox" checked={local.hideDescriptions} onChange={e => setLocal(p => ({ ...p, hideDescriptions: e.target.checked }))} />Hide catalog descriptions</label>
    <div className="toolbar"><button data-focus disabled={!ready || busy} onClick={() => { void save(); }}>Save settings</button><button data-focus onClick={() => { void clear(); }}>Erase playback history</button><button data-focus onClick={() => { eraseLocalData(); setNotice('Pairing, favorites, and catalog removed from local storage; current in-memory session remains active.'); onChange(); }}>Clear local browsing data</button><button data-focus onClick={() => { void exportData(); }}>Export display data</button><button data-focus onClick={onClose}>Close</button></div>
    <p>Disabling playback history erases existing companion resume points. Pairing and catalog persistence are off by default. Encrypted scratchpad data is deleted inside the scratchpad app.</p>
    {notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
