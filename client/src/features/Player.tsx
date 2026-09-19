import { useEffect, useRef, useState } from 'react';
import type { Companion } from '../core/api';
import type { Entry, PlaybackState, Progress } from '../core/types';
import { isBack, mediaAction } from '../platform/webos';
export function Player({ entry, api, resume, onClose }: { entry: Entry; api: Companion; resume?: Progress; onClose(): void }) {
  const video = useRef<HTMLVideoElement>(null); const [source, setSource] = useState('');
  const [state, setState] = useState<PlaybackState>('loading'); const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0); const position = useRef(resume && resume.position < resume.duration * 0.95 ? resume.position : 0);
  const resumeFrom = useRef(position.current);
  const saving = useRef(false); const wantsPlay = useRef(true); const expiry = useRef(0); const refreshes = useRef(0);
  useEffect(() => {
    const controller = new AbortController(); setState('loading'); setError('');
    api.ticket(entry.id, controller.signal).then(ticket => {
      if (controller.signal.aborted) return;
      resumeFrom.current = position.current;
      expiry.current = ticket.expires; setSource(api.session.baseURL + ticket.path);
    }).catch(e => { if (!controller.signal.aborted) { setError(String(e)); setState('failed'); } });
    return () => controller.abort();
  }, [api, entry.id, attempt]);
  async function checkpoint() {
    const element = video.current;
    if (!element || saving.current || !Number.isFinite(element.duration) || element.duration <= 0) return;
    position.current = element.currentTime; saving.current = true;
    try { await api.saveProgress(entry.id, Math.min(element.currentTime, element.duration), element.duration); }
    catch { /* Continue playback; offline resume writes are not replayed out of order. */ }
    finally { saving.current = false; }
  }
  useEffect(() => {
    const interval = setInterval(() => { void checkpoint(); }, 15000);
    const visibility = () => { if (document.hidden) { wantsPlay.current = false; video.current?.pause(); void checkpoint(); } };
    function key(event: KeyboardEvent) {
      const element = video.current; if (!element) return;
      if (isBack(event)) { event.preventDefault(); event.stopPropagation(); void checkpoint(); onClose(); return; }
      const action = mediaAction(event);
      if (action === 'play') { event.preventDefault(); wantsPlay.current = true; void element.play().catch(e => setError(String(e))); }
      if (action === 'pause') { event.preventDefault(); wantsPlay.current = false; element.pause(); }
      if (action === 'stop') { event.preventDefault(); wantsPlay.current = false; element.pause(); void checkpoint(); onClose(); }
      if (event.key === ' ' && event.target === element) { event.preventDefault(); toggle(); }
    }
    document.addEventListener('keydown', key, true); document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(interval); document.removeEventListener('keydown', key, true); document.removeEventListener('visibilitychange', visibility); };
  }, [api, entry.id, onClose]);
  function toggle() {
    const element = video.current; if (!element) return;
    wantsPlay.current = element.paused;
    if (element.paused) void element.play().catch(e => setError(String(e))); else element.pause();
  }
  function retry() { const element = video.current; if (element && Number.isFinite(element.currentTime)) position.current = element.currentTime; refreshes.current = 0; setAttempt(n => n + 1); }
  return <section className="player" aria-label={entry.title}>
    <video ref={video} src={source || undefined} controls autoPlay playsInline
      onLoadedMetadata={() => { const el = video.current!; if (resumeFrom.current > 0 && Number.isFinite(el.duration)) el.currentTime = Math.min(resumeFrom.current, Math.max(0, el.duration - 1)); setState('ready'); if (wantsPlay.current) void el.play().catch(e => setError(String(e))); }}
      onTimeUpdate={() => { if (video.current) position.current = video.current.currentTime; }}
      onPlaying={() => setState('playing')} onPause={() => { setState('paused'); void checkpoint(); }} onWaiting={() => setState('buffering')}
      onEnded={() => { setState('ended'); void checkpoint(); }}
      onError={() => {
        if (!source) return;
        if (Date.now() / 1000 >= expiry.current && refreshes.current < 1) { refreshes.current++; setAttempt(n => n + 1); }
        else { setState('failed'); setError('Playback failed. Check file availability, container, and TV codec support.'); }
      }} />
    <div className="player-controls"><div><span className="eyebrow">{state}</span><h2>{entry.title}</h2><p>{entry.description}</p></div>
      <button data-focus onClick={toggle}>Play / pause</button><button data-focus onClick={() => { if (video.current) video.current.currentTime = Math.max(0, video.current.currentTime - 30); }}>Back 30s</button>
      <button data-focus onClick={retry}>Renew stream</button><button data-focus onClick={() => { void checkpoint(); onClose(); }}>Close</button></div>
    {error && <p role="alert">{error}</p>}
  </section>;
}
