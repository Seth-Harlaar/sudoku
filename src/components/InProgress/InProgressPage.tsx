import { useEffect } from 'react';
import { useGameStore } from '../../state/gameStore.ts';
import { useUiStore } from '../../state/uiStore.ts';
import { useViewStore } from '../../state/viewStore.ts';
import { useInProgressStore, type InProgressEntry } from '../../state/inProgressStore.ts';
import { formatTime } from '../Timer.tsx';
import { IconLibrary } from '../icons.tsx';
import styles from './InProgressPage.module.css';

export function InProgressPage() {
  const loading = useInProgressStore((s) => s.loading);
  const entries = useInProgressStore((s) => s.entries);
  const load = useInProgressStore((s) => s.load);

  const open = useGameStore((s) => s.open);
  const currentId = useGameStore((s) => s.puzzle?.id);
  const hideMistakes = useUiStore((s) => s.hideMistakes);
  const go = useViewStore((s) => s.go);

  useEffect(() => {
    void load();
  }, [load]);

  const resume = async (entry: InProgressEntry) => {
    hideMistakes();
    await open(entry.puzzle);
    go('game');
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>In progress</h1>
        <span className={styles.count}>
          {loading
            ? 'Loading…'
            : `${entries.length} game${entries.length === 1 ? '' : 's'}`}
        </span>
      </header>

      {!loading && entries.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No games in progress</p>
          <p className={styles.emptyText}>Pick a puzzle from the library to start playing.</p>
          <button className={styles.browse} onClick={() => go('library')}>
            <IconLibrary className={styles.browseIcon} />
            Browse library
          </button>
        </div>
      ) : (
        <ul className={styles.list}>
          {entries.map((e) => (
            <li key={e.puzzle.id}>
              <button
                className={`${styles.card} ${e.puzzle.id === currentId ? styles.cardCurrent : ''}`}
                onClick={() => void resume(e)}
              >
                <div className={styles.cardMain}>
                  <span className={styles.cardTitle}>
                    {e.puzzle.title ?? `Puzzle ${e.puzzle.id.slice(0, 8)}`}
                  </span>
                  <div className={styles.cardMeta}>
                    {e.puzzle.difficulty && (
                      <span className={styles.badge}>{e.puzzle.difficulty}</span>
                    )}
                    <span className={styles.metaText}>{formatTime(e.elapsedMs)}</span>
                  </div>
                </div>
                <div className={styles.progressWrap} aria-hidden>
                  <div
                    className={styles.progressBar}
                    style={{ width: `${Math.round(e.progress * 100)}%` }}
                  />
                </div>
                <span className={styles.percent}>{Math.round(e.progress * 100)}%</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
