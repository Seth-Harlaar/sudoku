import { useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import { useGameStore } from '../../state/gameStore.ts';
import { useUiStore } from '../../state/uiStore.ts';
import { useViewStore } from '../../state/viewStore.ts';
import {
  filterEntries,
  useLibraryStore,
  type DifficultyFilter,
  type StatusFilter,
} from '../../state/libraryStore.ts';
import { formatTime } from '../Timer.tsx';
import { IconImport, IconSearch } from '../icons.tsx';
import styles from './LibraryPage.module.css';

const MAX_VISIBLE = 300;
const DIFFICULTIES: DifficultyFilter[] = ['all', 'easy', 'medium', 'hard', 'expert'];
const STATUSES: StatusFilter[] = ['all', 'new', 'in-progress', 'solved'];
const STATUS_LABEL: Record<string, string> = {
  new: 'New',
  'in-progress': 'In progress',
  solved: 'Solved',
};

export function LibraryPage() {
  const loading = useLibraryStore((s) => s.loading);
  const entries = useLibraryStore((s) => s.entries);
  const search = useLibraryStore((s) => s.search);
  const difficulty = useLibraryStore((s) => s.difficulty);
  const status = useLibraryStore((s) => s.status);
  const lastImport = useLibraryStore((s) => s.lastImport);
  const setSearch = useLibraryStore((s) => s.setSearch);
  const setDifficulty = useLibraryStore((s) => s.setDifficulty);
  const setStatus = useLibraryStore((s) => s.setStatus);
  const importText = useLibraryStore((s) => s.importText);
  const refresh = useLibraryStore((s) => s.refresh);

  const open = useGameStore((s) => s.open);
  const currentId = useGameStore((s) => s.puzzle?.id);
  const hideMistakes = useUiStore((s) => s.hideMistakes);
  const go = useViewStore((s) => s.go);
  const fileRef = useRef<HTMLInputElement>(null);

  // Refresh on mount so the page reflects the latest progress/completions.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(
    () => filterEntries(entries, search, difficulty, status),
    [entries, search, difficulty, status],
  );

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await importText(await file.text());
  };

  const openPuzzle = (id: string) => {
    const entry = entries.find((en) => en.puzzle.id === id);
    if (!entry) return;
    hideMistakes();
    void open(entry.puzzle);
    go('game');
  };

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <label className={styles.searchBox}>
          <IconSearch className={styles.searchIcon} />
          <input
            className={styles.search}
            type="search"
            placeholder="Search puzzles"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <select
          className={styles.select}
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as DifficultyFilter)}
          aria-label="Filter by difficulty"
        >
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d === 'all' ? 'All difficulties' : d}
            </option>
          ))}
        </select>

        <select
          className={styles.select}
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All' : STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <button className={styles.import} onClick={() => fileRef.current?.click()}>
          <IconImport className={styles.importIcon} />
          Import CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          hidden
          onChange={onPickFile}
        />
      </div>

      <div className={styles.subbar}>
        <span className={styles.count}>
          {loading
            ? 'Loading…'
            : `${filtered.length} puzzle${filtered.length === 1 ? '' : 's'}`}
        </span>
        {lastImport && (
          <span className={styles.report}>
            Imported {lastImport.added} new
            {lastImport.duplicates ? `, ${lastImport.duplicates} already had` : ''}
            {lastImport.errors ? `, ${lastImport.errors} skipped` : ''}
          </span>
        )}
      </div>

      <ul className={styles.grid}>
        {filtered.slice(0, MAX_VISIBLE).map((e) => (
          <li key={e.puzzle.id}>
            <button
              className={`${styles.card} ${e.puzzle.id === currentId ? styles.cardCurrent : ''}`}
              onClick={() => openPuzzle(e.puzzle.id)}
            >
              <div className={styles.cardTop}>
                <span className={styles.cardTitle}>
                  {e.puzzle.title ?? `Puzzle ${e.puzzle.id.slice(0, 6)}`}
                </span>
                <span className={`${styles.dot} ${styles[`dot_${e.status}`]}`} />
              </div>
              <div className={styles.cardMeta}>
                {e.puzzle.difficulty && (
                  <span className={styles.badge}>{e.puzzle.difficulty}</span>
                )}
                {e.puzzle.clues != null && (
                  <span className={styles.metaText}>{e.puzzle.clues} clues</span>
                )}
              </div>
              <div className={styles.cardStatus}>
                {e.status === 'solved' && e.bestMs != null
                  ? `Best ${formatTime(e.bestMs)}`
                  : STATUS_LABEL[e.status]}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {filtered.length > MAX_VISIBLE && (
        <p className={styles.more}>
          Showing first {MAX_VISIBLE} of {filtered.length}. Refine your search to see more.
        </p>
      )}
    </div>
  );
}
