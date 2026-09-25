import { useEffect, useState } from 'react';
import { advance, initialTimer, remaining, toggleTimer } from './timer';
export function FocusTimer({ onClose }: { onClose(): void }) {
  const [timer, setTimer] = useState(initialTimer); const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = () => { const value = Date.now(); setNow(value); setTimer(t => advance(t, value)); };
    const id = setInterval(tick, 250); document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, []);
  const seconds = remaining(timer, now);
  return <section className="utility focus-app"><span className="eyebrow">{timer.mode === 'focus' ? 'FOCUS INTERVAL' : 'TAKE A BREAK'}</span>
    <h1 aria-live="off">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</h1>
    <p>{timer.sessions} completed focus intervals this session</p><div className="toolbar">
      <button data-focus onClick={() => setTimer(t => toggleTimer(t, Date.now()))}>{timer.deadline === null ? 'Start' : 'Pause'}</button>
      <button data-focus onClick={() => setTimer({ ...initialTimer })}>Reset</button><button data-focus onClick={onClose}>Close</button>
    </div><p>Timers stay in memory and stop when this application is closed.</p>
  </section>;
}
