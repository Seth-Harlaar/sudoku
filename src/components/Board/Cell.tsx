import { memo } from 'react';
import type { Cell as CellData } from '../../game/types.ts';
import { isBoxBottomEdge, isBoxRightEdge } from '../../game/grid.ts';
import styles from './Board.module.css';

export interface CellProps {
  index: number;
  cell: CellData;
  selected: boolean;
  conflict: boolean;
  mistake: boolean;
  sameDigit: boolean;
  /** Long-press peek: this cell holds the peeked digit. */
  peekSame: boolean;
  /** Long-press peek: this cell is eliminated by an occurrence of the digit. */
  peekElim: boolean;
}

/** Corner-mark slot order: up to 8 marks placed around the cell corners/edges. */
const CORNER_SLOTS = ['tl', 'tr', 'bl', 'br', 'tc', 'bc', 'cl', 'cr'] as const;

function CellView({
  index,
  cell,
  selected,
  conflict,
  mistake,
  sameDigit,
  peekSame,
  peekElim,
}: CellProps) {
  const classes = [styles.cell];
  if (isBoxRightEdge(index)) classes.push(styles.boxRight);
  if (isBoxBottomEdge(index)) classes.push(styles.boxBottom);
  if (sameDigit) classes.push(styles.sameDigit);
  if (peekElim) classes.push(styles.peekElim);
  if (peekSame) classes.push(styles.peekSame);
  if (conflict) classes.push(styles.conflict);

  const style =
    cell.color != null
      ? ({ '--cell-bg': `var(--cell-color-${cell.color})` } as React.CSSProperties)
      : undefined;

  return (
    <div
      className={classes.join(' ')}
      style={style}
      data-index={index}
      role="gridcell"
      aria-selected={selected}
    >
      {cell.color != null && <span className={styles.colorFill} aria-hidden />}

      {cell.value != null ? (
        <span
          className={[
            styles.value,
            cell.given ? styles.given : styles.entered,
            mistake ? styles.mistake : '',
          ].join(' ')}
        >
          {cell.value}
        </span>
      ) : (
        <>
          {cell.center.length > 0 && (
            <span className={styles.center}>{cell.center.join('')}</span>
          )}
          {cell.corner.length > 0 && (
            <span className={styles.cornerWrap} aria-hidden>
              {cell.corner.slice(0, 8).map((d, i) => (
                <span key={d} className={styles[`corner_${CORNER_SLOTS[i]}`]}>
                  {d}
                </span>
              ))}
            </span>
          )}
        </>
      )}
    </div>
  );
}

export const Cell = memo(CellView);
