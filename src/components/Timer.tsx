import { useGameStore } from '../state/gameStore.ts';

/** Format milliseconds as M:SS or H:MM:SS. */
export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function Timer() {
  const elapsed = useGameStore((s) => s.game?.elapsedMs ?? 0);
  return (
    <time className="timer" aria-label="Elapsed time">
      {formatTime(elapsed)}
    </time>
  );
}
