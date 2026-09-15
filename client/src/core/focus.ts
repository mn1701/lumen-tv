// Spatial navigation uses live geometry so changing collections does not require fixed indices.
type Direction = 'left' | 'right' | 'up' | 'down';
const keyDirection: Record<string, Direction> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
const visible = (node: HTMLElement) => node.getClientRects().length > 0 && !node.hasAttribute('disabled') && node.getAttribute('aria-hidden') !== 'true';
export function focusFirst(root: HTMLElement = document.body) {
  const first = Array.from(root.querySelectorAll<HTMLElement>('[data-focus]')).find(visible);
  first?.focus();
}
export function installNavigation(root: HTMLElement): () => void {
  function move(event: KeyboardEvent) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const active = document.activeElement as HTMLElement | null;
    // Inputs retain their editing and selection behavior on the TV virtual keyboard.
    if (active?.matches('input, textarea, select, video, [contenteditable=true]')) return;
    const direction = keyDirection[event.key] || ({ 37: 'left', 38: 'up', 39: 'right', 40: 'down' } as Record<number, Direction>)[event.keyCode]; if (!direction) return;
    const candidates = Array.from(root.querySelectorAll<HTMLElement>('[data-focus]')).filter(visible);
    if (!active || !candidates.includes(active)) { event.preventDefault(); candidates[0]?.focus(); return; }
    const current = active.getBoundingClientRect(); const cx = current.left + current.width / 2, cy = current.top + current.height / 2;
    let winner: HTMLElement | undefined; let best = Infinity;
    for (const node of candidates) {
      if (node === active) continue;
      const rect = node.getBoundingClientRect(); const dx = rect.left + rect.width / 2 - cx, dy = rect.top + rect.height / 2 - cy;
      const horizontal = direction === 'left' || direction === 'right';
      const primary = horizontal ? dx * (direction === 'left' ? -1 : 1) : dy * (direction === 'up' ? -1 : 1);
      if (primary <= 1) continue;
      const secondary = Math.abs(horizontal ? dy : dx);
      const overlap = horizontal ? rect.bottom > current.top && rect.top < current.bottom : rect.right > current.left && rect.left < current.right;
      const score = primary + secondary * 2 + (overlap ? 0 : 120);
      if (score < best) { winner = node; best = score; }
    }
    event.preventDefault(); winner?.focus(); winner?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  root.addEventListener('keydown', move);
  return () => root.removeEventListener('keydown', move);
}
