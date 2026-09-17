import { FormEvent, useState } from 'react';
import { pair } from '../core/api';
import { normalizeBase } from '../core/session';
import type { Session } from '../core/types';
export function Pairing({ onPaired }: { onPaired(session: Session): void }) {
  const [origin, setOrigin] = useState('http://127.0.0.1:8090');
  const [name, setName] = useState('Living room TV'); const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { onPaired(await pair(normalizeBase(origin.trim()), name.trim(), code)); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  return <section className="pairing"><span className="eyebrow">CONNECT A DISPLAY</span><h1>Your screen, your library.</h1><p>Enter the companion's LAN address and the code shown in its terminal.</p>
    <form onSubmit={submit}><label>Companion address<input data-focus value={origin} onChange={e => setOrigin(e.target.value)} required /></label>
      <label>Display name<input data-focus maxLength={80} value={name} onChange={e => setName(e.target.value)} required /></label>
      <label>Pairing code<input data-focus inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} required /></label>
      <button data-focus disabled={busy}>{busy ? 'Connecting' : 'Pair display'}</button></form>{error && <p role="alert">{error}</p>}
  </section>;
}
