import { useEffect, useRef } from 'react';
import { useGameStore } from '../state/gameStore.ts';
import { usePageVisibility } from './usePageVisibility.ts';

/**
 * Drives the game clock: dispatches `tick` once a second while a puzzle is being
 * played and the page is visible. Pauses on solve, on hidden tab, and when no game
 * is loaded. Uses wall-clock deltas so a throttled/backgrounded tab stays accurate.
 */
export function useGameTimer(): void {
  const dispatch = useGameStore((s) => s.dispatch);
  const status = useGameStore((s) => s.game?.status);
  const hasGame = useGameStore((s) => s.game != null);
  const visible = usePageVisibility();
  const lastRef = useRef<number | null>(null);

  const running = hasGame && status !== 'solved' && visible;

  useEffect(() => {
    if (!running) {
      lastRef.current = null;
      return;
    }
    lastRef.current = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const last = lastRef.current ?? now;
      lastRef.current = now;
      dispatch({ type: 'tick', deltaMs: now - last });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, dispatch]);
}
