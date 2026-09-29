import { useEffect, useRef, useState } from 'react';
import { openNote, sealNote } from './vault';
const STORAGE = 'lumen.scratchpad.v1';
export function Scratchpad({ onClose }: { onClose(): void }) {
  const [password, setPassword] = useState(''), [text, setText] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('Locked');
  const epoch = useRef(0);
  function lock() { epoch.current++; setPassword(''); setText(''); setNotice('Locked'); setBusy(false); }
  useEffect(() => {
    const hide = () => { if (document.hidden) lock(); };
    const id = setInterval(lock, 5 * 60 * 1000); document.addEventListener('visibilitychange', hide);
    return () => { epoch.current++; clearInterval(id); document.removeEventListener('visibilitychange', hide); };
  }, []);
  async function act(mode: 'save' | 'unlock') {
    const current = epoch.current; setBusy(true); setError('');
    try {
      if (mode === 'save') {
        const sealed = await sealNote(text, password);
        if (epoch.current !== current) return;
        localStorage.setItem(STORAGE, JSON.stringify(sealed)); setNotice('Encrypted note saved on this display'); setPassword('');
      } else {
        const saved = localStorage.getItem(STORAGE); if (!saved) throw new Error('There is no saved note.');
        const decoded = await openNote(JSON.parse(saved), password);
        if (epoch.current !== current) return;
        setText(decoded); setPassword(''); setNotice('Unlocked in memory; enter the password again to save edits');
      }
    } catch (e) { if (current === epoch.current) setError(String(e)); }
    finally { if (current === epoch.current) setBusy(false); }
  }
  return <section className="utility"><span className="eyebrow">LOCAL ENCRYPTED STORAGE</span><h1>Locked scratchpad</h1><p>{notice}</p>
    <label>Password<input data-focus type="password" minLength={12} value={password} onChange={e => setPassword(e.target.value)} autoComplete="off" /></label>
    <label>Note<textarea data-focus rows={8} maxLength={32000} value={text} onChange={e => setText(e.target.value)} /></label>
    <div className="toolbar"><button data-focus disabled={busy} onClick={() => { void act('unlock'); }}>Unlock</button><button data-focus disabled={busy} onClick={() => { void act('save'); }}>Encrypt and save</button><button data-focus onClick={lock}>Lock</button>
      <button data-focus onClick={() => { localStorage.removeItem(STORAGE); lock(); setNotice('Saved ciphertext deleted'); }}>Delete saved note</button><button data-focus onClick={() => { lock(); onClose(); }}>Close</button></div>
    <p>The note never goes to the companion. It locks on backgrounding and every five minutes. Lost passwords cannot be recovered.</p>{error && <p role="alert">{error}</p>}
  </section>;
}
