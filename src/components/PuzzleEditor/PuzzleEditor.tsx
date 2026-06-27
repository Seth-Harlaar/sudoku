import { useCallback, useState, type KeyboardEvent } from 'react';
import {
  CELL_COUNT,
  SIZE,
  clamp,
  colOf,
  indexOf,
  isBoxBottomEdge,
  isBoxRightEdge,
  rowOf,
} from '../../game/grid.ts';
import { IconErase } from '../icons.tsx';
import styles from './PuzzleEditor.module.css';

export interface PuzzleEditorProps {
  /** 81 row-major cells; null = blank. Controlled. */
  value: (number | null)[];
  onChange: (next: (number | null)[]) => void;
  /** Optional per-cell flag to highlight uncertain (e.g. low-confidence OCR) cells. */
  uncertain?: boolean[];
  className?: string;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * A standalone, controlled 9x9 grid editor with a plain number pad. Has no dependency
 * on the game engine/stores so it can be reused for manual puzzle entry as well as the
 * screenshot-import review screen.
 */
export function PuzzleEditor({ value, onChange, uncertain, className }: PuzzleEditorProps) {
  const [selected, setSelected] = useState(0);

  const setAt = useCallback(
    (i: number, d: number | null) => {
      if (value[i] === d) return;
      const next = value.slice();
      next[i] = d;
      onChange(next);
    },
    [value, onChange],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const r = rowOf(selected);
    const c = colOf(selected);
    if (e.key === 'ArrowUp') setSelected(indexOf(clamp(r - 1, 0, SIZE - 1), c));
    else if (e.key === 'ArrowDown') setSelected(indexOf(clamp(r + 1, 0, SIZE - 1), c));
    else if (e.key === 'ArrowLeft') setSelected(indexOf(r, clamp(c - 1, 0, SIZE - 1)));
    else if (e.key === 'ArrowRight') setSelected(indexOf(r, clamp(c + 1, 0, SIZE - 1)));
    else if (e.key >= '1' && e.key <= '9') setAt(selected, Number(e.key));
    else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete')
      setAt(selected, null);
    else return;
    e.preventDefault();
  };

  return (
    <div className={`${styles.editor} ${className ?? ''}`}>
      <div
        className={styles.grid}
        role="grid"
        aria-label="Puzzle editor"
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        {Array.from({ length: CELL_COUNT }, (_, i) => {
          const cls = [styles.cell];
          if (isBoxRightEdge(i)) cls.push(styles.boxRight);
          if (isBoxBottomEdge(i)) cls.push(styles.boxBottom);
          if (i === selected) cls.push(styles.selected);
          if (uncertain?.[i] && value[i] != null) cls.push(styles.uncertain);
          return (
            <button
              key={i}
              type="button"
              className={cls.join(' ')}
              role="gridcell"
              aria-selected={i === selected}
              onClick={() => setSelected(i)}
            >
              {value[i] ?? ''}
            </button>
          );
        })}
      </div>

      <div className={styles.pad}>
        <div className={styles.keys}>
          {DIGITS.map((n) => (
            <button
              key={n}
              type="button"
              className={styles.key}
              onClick={() => setAt(selected, n)}
              aria-label={`Set ${n}`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.erase}
          onClick={() => setAt(selected, null)}
          aria-label="Erase cell"
        >
          <IconErase className={styles.eraseIcon} />
          Erase
        </button>
      </div>
    </div>
  );
}
