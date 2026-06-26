import { useMemo } from 'react';
import { selectionLoops } from './selectionPath.ts';
import styles from './Board.module.css';

/**
 * Renders the selection as a single continuous outline traced around the selected
 * region (rounded joins, drawn on the grid lines, no inside-corner gaps). Sits as
 * an SVG overlay over the 9x9 grid; stroke width is kept constant in pixels via
 * `vector-effect: non-scaling-stroke`.
 */
export function SelectionOverlay({ selection }: { selection: readonly number[] }) {
  const loops = useMemo(() => selectionLoops(selection), [selection]);
  if (loops.length === 0) return null;

  return (
    <svg
      className={styles.selOverlay}
      viewBox="0 0 9 9"
      preserveAspectRatio="none"
      aria-hidden
    >
      {loops.map((d, i) => (
        <path
          key={i}
          d={d}
          className={styles.selStroke}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
