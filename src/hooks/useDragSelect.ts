import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useGameStore } from '../state/gameStore.ts';
import { useUiStore } from '../state/uiStore.ts';

/** Read the cell index under a pointer position, or null if outside the grid. */
function cellIndexAt(x: number, y: number): number | null {
  const el = document.elementFromPoint(x, y);
  const cell = el?.closest<HTMLElement>('[data-index]');
  if (!cell) return null;
  const idx = Number(cell.dataset.index);
  return Number.isInteger(idx) ? idx : null;
}

const LONG_PRESS_MS = 380;
const MOVE_CANCEL_PX = 10;

/**
 * Pointer-based cell selection: click to select, drag to paint a multi-selection,
 * Ctrl/Cmd-click to toggle individual cells. A long-press on a filled cell enters
 * "peek" mode (highlight that digit and the cells it eliminates) until release.
 * Returns handlers to spread on the board.
 */
export function useDragSelect() {
  const dispatch = useGameStore((s) => s.dispatch);
  const dragging = useRef(false);
  const peeking = useRef(false);
  const pressTimer = useRef<number | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const cancelLongPress = useCallback(() => {
    if (pressTimer.current != null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      const i = cellIndexAt(e.clientX, e.clientY);
      if (i == null) return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragging.current = true;
      peeking.current = false;
      startPos.current = { x: e.clientX, y: e.clientY };

      // A new interaction dismisses any sticky peek left from a previous long-press.
      if (useUiStore.getState().peek != null) useUiStore.getState().setPeek(null);

      const additive = e.ctrlKey || e.metaKey || e.shiftKey;
      const current = useGameStore.getState().game?.selection ?? [];
      if (additive) {
        const next = current.includes(i)
          ? current.filter((c) => c !== i)
          : [...current, i];
        dispatch({ type: 'select', cells: next });
      } else {
        dispatch({ type: 'select', cells: [i] });
      }

      // Arm long-press peek on a filled cell (not while building a multi-select).
      const value = useGameStore.getState().game?.cells[i]?.value;
      if (!additive && value != null) {
        cancelLongPress();
        pressTimer.current = window.setTimeout(() => {
          peeking.current = true;
          dispatch({ type: 'select', cells: [i] });
          useUiStore.getState().setPeek(value);
        }, LONG_PRESS_MS);
      }
    },
    [dispatch, cancelLongPress],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!dragging.current) return;
      // Movement beyond the threshold means this is a drag, not a long-press.
      const start = startPos.current;
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_CANCEL_PX) {
        cancelLongPress();
        if (peeking.current) {
          peeking.current = false;
          useUiStore.getState().setPeek(null);
        }
      }
      if (peeking.current) return; // don't paint a selection while peeking
      const i = cellIndexAt(e.clientX, e.clientY);
      if (i == null) return;
      const current = useGameStore.getState().game?.selection ?? [];
      if (!current.includes(i)) {
        dispatch({ type: 'select', cells: [...current, i] });
      }
    },
    [dispatch, cancelLongPress],
  );

  const endDrag = useCallback(
    (e: ReactPointerEvent) => {
      dragging.current = false;
      startPos.current = null;
      cancelLongPress();
      // Note: a triggered peek is intentionally NOT cleared on release — it stays
      // pinned until the next interaction (pointer down) or Escape.
      peeking.current = false;
      const el = e.currentTarget as HTMLElement;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    },
    [cancelLongPress],
  );

  return { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag };
}
