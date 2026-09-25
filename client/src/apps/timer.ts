export type TimerMode = 'focus' | 'rest';
export interface TimerState { mode: TimerMode; remaining: number; deadline: number | null; sessions: number }
export const initialTimer: TimerState = { mode: 'focus', remaining: 25 * 60, deadline: null, sessions: 0 };
export function remaining(state: TimerState, now: number) { return state.deadline === null ? state.remaining : Math.max(0, Math.ceil((state.deadline - now) / 1000)); }
export function advance(state: TimerState, now: number): TimerState {
  if (state.deadline === null || state.deadline > now) return state;
  const mode = state.mode === 'focus' ? 'rest' : 'focus';
  // Complete one interval, then wait for an explicit start. Background throttling cannot create phantom sessions.
  return { mode, remaining: mode === 'focus' ? 1500 : 300, deadline: null, sessions: state.sessions + (state.mode === 'focus' ? 1 : 0) };
}
export function toggleTimer(state: TimerState, now: number): TimerState {
  const current = advance(state, now);
  return current.deadline === null ? { ...current, deadline: now + current.remaining * 1000 } : { ...current, remaining: remaining(current, now), deadline: null };
}
