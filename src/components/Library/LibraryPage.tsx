import { useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import { useGameStore } from '../../state/gameStore.ts';
import { useUiStore } from '../../state/uiStore.ts';
import { useViewStore } from '../../state/viewStore.ts';
import {
  filterItems,
  statusOf,
  useLibraryStore,
  type DifficultyFilter,
  type LibraryItem,
  type StatusFilter,
} from '../../state/libraryStore.ts';
import { formatTime } from '../Timer.tsx';
import { IconImport, IconSearch } from '../icons.tsx';
import { VirtualGrid } from './VirtualGrid.tsx';
import styles from './LibraryPage.module.css';

const DIFFICULTIES: DifficultyFilter[] = ['all', 'easy', 'medium', 'hard', 'expert'];
const STATUSES: StatusFilter[] = ['all', 'new', 'in-progress', 'solved'];
const STATUS_LABEL: Record<string, string> = {
  new: 'New',
  'in-progress': 'In progress',
  solved: 'Solved',
};

// Card geometry for the windowed grid (px). Kept in sync with the CSS card.
const CARD_HEIGHT = 104;
const MIN_COL = 200;
const GAP = 12;

export function LibraryPage() {
  const loading = useLibraryStore((s) => s.loading);
  const items = useLibraryStore((s) => s.items);
  const statusById = useLibraryStore((s) => s.statusById);
  const search = useLibraryStore((s) => s.search);
  const difficulty = useLibraryStore((s) => s.difficulty);
  const status = useLibraryStore((s) => s.status);
  const lastImport = useLibraryStore((s) => s.lastImport);
  const setSearch = useLibraryStore((s) => s.setSearch);
  const setDifficulty = useLibraryStore((s) => s.setDifficulty);
  const setStatus = useLibraryStore((s) => s.setStatus);
  const importText = useLibraryStore((s) => s.importText);
  const resolve = useLibraryStore((s) => s.resolve);
  const load = useLibraryStore((s) => s.load);

  const open = useGameStore((s) => s.open);
  const currentId = useGameStore((s) => s.puzzle?.id);
  const hideMistakes = useUiStore((s) => s.hideMistakes);
  const go = useViewStore((s) => s.go);
  const fileRef = useRef<HTMLInputElement>(null);

  // Refresh statuses on mount so the page reflects the latest progress/completions.
  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => filterItems(items, statusById, search, difficulty, status),
    [items, statusById, search, difficulty, status],
  );

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await importText(await file.text());
  };

  const openItem = async (item: LibraryItem) => {
    hideMistakes();
    const puzzle = await resolve(item);
    await open(puzzle);
    go('game');
  };

  const renderCard = (item: LibraryItem) => {
    const st = statusOf(statusById, item.id);
    return (
      <button
        className={`${styles.card} ${item.id === currentId ? styles.cardCurrent : ''}`}
        onClick={() => void openItem(item)}
      >
        <div className={styles.cardTop}>
          <span className={styles.cardTitle}>
            {item.title ?? `Puzzle ${item.id.slice(0, 8)}`}
          </span>
          <span className={`${styles.dot} ${styles[`dot_${st.status}`]}`} />
        </div>
        <div className={styles.cardMeta}>
          {item.difficulty && <span className={styles.badge}>{item.difficulty}</span>}
          {item.clues != null && <span className={styles.metaText}>{item.clues} clues</span>}
        </div>
        <div className={styles.cardStatus}>
          {st.status === 'solved' && st.bestMs != null
            ? `Best ${formatTime(st.bestMs)}`
            : STATUS_LABEL[st.status]}
        </div>
      </button>
    );
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
            : `${filtered.length.toLocaleString()} puzzle${filtered.length === 1 ? '' : 's'}`}
        </span>
        {lastImport && (
          <span className={styles.report}>
            Imported {lastImport.added} new
            {lastImport.duplicates ? `, ${lastImport.duplicates} already had` : ''}
            {lastImport.errors ? `, ${lastImport.errors} skipped` : ''}
          </span>
        )}
      </div>

      <VirtualGrid
        className={styles.scroll}
        items={filtered}
        minColWidth={MIN_COL}
        rowHeight={CARD_HEIGHT}
        gap={GAP}
        itemKey={(item) => item.id}
        renderItem={renderCard}
      />
    </div>
  );
}
