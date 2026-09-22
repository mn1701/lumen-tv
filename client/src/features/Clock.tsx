import { useEffect, useState } from 'react';
export function Clock({ onClose }: { onClose(): void }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  return <section className="clock"><span className="eyebrow">LOCAL TIME</span><time>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time><p>{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p><button data-focus onClick={onClose}>Back to library</button></section>;
}
