import type { ComponentType, SVGProps } from 'react';
import { useGameStore } from '../../state/gameStore.ts';
import { useUiStore } from '../../state/uiStore.ts';
import { digitCounts } from '../../state/selectors.ts';
import type { Mode } from '../../game/types.ts';
import { SIZE } from '../../game/grid.ts';
import {
  IconCenter,
  IconCheck,
  IconColor,
  IconCorner,
  IconErase,
  IconNormal,
  IconRedo,
  IconUndo,
} from '../icons.tsx';
import styles from './Controls.module.css';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

const MODES: { mode: Mode; label: string; hint: string; Icon: IconType }[] = [
  { mode: 'normal', label: 'Normal', hint: '', Icon: IconNormal },
  { mode: 'corner', label: 'Corner', hint: 'Shift', Icon: IconCorner },
  { mode: 'center', label: 'Center', hint: 'Ctrl', Icon: IconCenter },
  { mode: 'color', label: 'Color', hint: 'Alt', Icon: IconColor },
];

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** 3x3 placement slot for a digit, so the numpad previews where marks will land. */
const POS = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'] as const;

export function Controls() {
  const game = useGameStore((s) => s.game);
  const dispatch = useGameStore((s) => s.dispatch);
  const hideMistakes = useUiStore((s) => s.hideMistakes);
  const reveal = useUiStore((s) => s.reveal);

  if (!game) return null;
  const { mode, cells, past, future } = game;
  const counts = digitCounts(cells);

  const input = (digit: number) => {
    hideMistakes();
    dispatch({ type: 'input', digit });
  };

  return (
    <div className={styles.controls}>
      <div className={styles.modes} role="tablist" aria-label="Input mode">
        {MODES.map((m) => (
          <button
            key={m.mode}
            role="tab"
            aria-selected={mode === m.mode}
            title={m.hint ? `${m.label} (${m.hint})` : m.label}
            className={`${styles.mode} ${mode === m.mode ? styles.modeActive : ''}`}
            onClick={() => dispatch({ type: 'setMode', mode: m.mode })}
          >
            <m.Icon className={styles.modeIcon} />
            <span className={styles.modeLabel}>{m.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.pad}>
        {DIGITS.map((d, i) => {
          const complete = counts[d] >= SIZE;
          return (
            <button
              key={d}
              className={`${styles.key} ${complete ? styles.keyComplete : ''}`}
              onClick={() => input(d)}
              aria-label={`Enter ${d}`}
            >
              {mode === 'color' ? (
                <span
                  className={styles.swatch}
                  style={{ background: `var(--cell-color-${d - 1})` }}
                />
              ) : (
                <span
                  className={styles.digit}
                  data-mode={mode}
                  data-pos={POS[i]}
                >
                  {d}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className={styles.actions}>
        <button
          className={styles.action}
          onClick={() => dispatch({ type: 'undo' })}
          disabled={past.length === 0}
          title="Undo"
          aria-label="Undo"
        >
          <IconUndo className={styles.actionIcon} />
        </button>
        <button
          className={styles.action}
          onClick={() => dispatch({ type: 'redo' })}
          disabled={future.length === 0}
          title="Redo"
          aria-label="Redo"
        >
          <IconRedo className={styles.actionIcon} />
        </button>
        <button
          className={styles.action}
          onClick={() => {
            hideMistakes();
            dispatch({ type: 'clear' });
          }}
          title="Erase"
          aria-label="Erase"
        >
          <IconErase className={styles.actionIcon} />
        </button>
        <button
          className={styles.action}
          onClick={reveal}
          title="Check"
          aria-label="Check"
        >
          <IconCheck className={styles.actionIcon} />
        </button>
      </div>
    </div>
  );
}
