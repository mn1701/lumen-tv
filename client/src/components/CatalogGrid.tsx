import type { Entry, Progress } from '../core/types';
const symbols = { video: 'PLAY', audio: 'LISTEN', image: 'VIEW', native: 'OPEN' };
export function CatalogGrid({ entries, progress, favorites, toggleFavorite, open }: {
  entries: Entry[]; progress: Record<string, Progress>; favorites: string[];
  toggleFavorite(id: string): void; open(entry: Entry): void;
}) {
  return <div className="catalog-grid">{entries.map(entry => {
    const resume = progress[entry.id]; const percent = resume?.duration > 0 ? Math.min(100, resume.position / resume.duration * 100) : 0;
    return <article key={entry.id} className={`tile tile-${entry.kind}`}>
      <button data-focus id={`entry-${entry.id}`} className="tile-main" onClick={() => open(entry)}><span className="tile-art" aria-hidden="true">{symbols[entry.kind]}<i /></span>
        <span className="eyebrow">{entry.collection || entry.kind}</span><strong>{entry.title}</strong><span className="tile-description">{entry.description}</span>
        {percent > 0 && <span className="resume"><span style={{ width: `${percent}%` }} /></span>}
      </button><button data-focus className="favorite" aria-pressed={favorites.includes(entry.id)} onClick={() => toggleFavorite(entry.id)}>{favorites.includes(entry.id) ? 'Saved' : 'Save'}</button>
    </article>;
  })}</div>;
}
