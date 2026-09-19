import { useEffect, useState } from 'react';
import type { Companion } from '../core/api';
import type { Entry } from '../core/types';
export function Gallery({ items, initial, api, onClose }: { items: Entry[]; initial: string; api: Companion; onClose(): void }) {
  const [index, setIndex] = useState(Math.max(0, items.findIndex(item => item.id === initial)));
  const [playing, setPlaying] = useState(false); const [url, setURL] = useState(''); const [error, setError] = useState('');
  const item = items[index];
  useEffect(() => {
    if (!item) return;
    const controller = new AbortController(); setURL(''); setError('');
    api.ticket(item.id, controller.signal).then(ticket => { if (!controller.signal.aborted) setURL(api.session.baseURL + ticket.path); }).catch(e => { if (!controller.signal.aborted) setError(String(e)); });
    return () => controller.abort();
  }, [api, item]);
  useEffect(() => { if (!playing || items.length < 2) return; const id = setInterval(() => setIndex(i => (i + 1) % items.length), 12000); return () => clearInterval(id); }, [playing, items.length]);
  return <section className="gallery">{url && <img src={url} alt={item?.description || item?.title} onError={() => setError('Image unavailable.')} />}<h2>{item?.title}</h2>
    <div className="toolbar"><button data-focus onClick={() => setIndex(i => (i + items.length - 1) % items.length)}>Previous</button><button data-focus onClick={() => setPlaying(v => !v)}>{playing ? 'Pause slideshow' : 'Start slideshow'}</button><button data-focus onClick={() => setIndex(i => (i + 1) % items.length)}>Next</button><button data-focus onClick={onClose}>Close</button></div>{error && <p role="alert">{error}</p>}</section>;
}
