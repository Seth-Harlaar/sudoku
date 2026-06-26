import { useEffect } from 'react';
import type { Mode } from '../game/types.ts';
import { useGameStore } from '../state/gameStore.ts';

/**
 * Global keyboard play (FR-G6):
 *  - Arrows move the cursor; Shift+Arrow extends the selection.
 *  - 1-9 enters a digit in the current mode; modifiers override the mode for that
 *    keystroke: Shift -> corner, Ctrl/Cmd -> center, Alt -> color.
 *  - Backspace/Delete clears; Esc deselects.
 *  - Ctrl/Cmd+Z undo, Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z redo.
 */
export function useKeyboard(): void {
  const dispatch = useGameStore((s) => s.dispatch);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when typing in an input/textarea/contenteditable.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      ) {
        return;
      }

      const mod = e.ctrlKey || e.metaKey;

      // Undo / redo
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
        return;
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        dispatch({ type: 'redo' });
        return;
      }
      // Select all
      if (mod && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        dispatch({ type: 'selectAll' });
        return;
      }

      // Movement
      const moves: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      const move = moves[e.key];
      if (move) {
        e.preventDefault();
        dispatch({ type: 'move', dRow: move[0], dCol: move[1], extend: e.shiftKey });
        return;
      }

      // Digit entry
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const digit = e.key.charCodeAt(0) - 48;
        let mode: Mode | undefined;
        if (e.altKey) mode = 'color';
        else if (mod) mode = 'center';
        else if (e.shiftKey) mode = 'corner';
        dispatch(mode ? { type: 'input', digit, mode } : { type: 'input', digit });
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        dispatch({ type: 'clear' });
        return;
      }
      if (e.key === 'Escape') {
        dispatch({ type: 'clearSelection' });
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);
}
