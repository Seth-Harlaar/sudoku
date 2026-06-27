import { useMemo } from 'react';
import { useGameStore } from '../../state/gameStore.ts';
import { useUiStore } from '../../state/uiStore.ts';
import { deriveHighlights, peekHighlights, peerDigitMasks } from '../../state/selectors.ts';
import { useDragSelect } from '../../hooks/useDragSelect.ts';
import { Cell } from './Cell.tsx';
import { SelectionOverlay } from './SelectionOverlay.tsx';
import styles from './Board.module.css';

export function Board() {
  const game = useGameStore((s) => s.game);
  const puzzle = useGameStore((s) => s.puzzle);
  const showConflicts = useUiStore((s) => s.showConflicts);
  const showMistakes = useUiStore((s) => s.showMistakes);
  const peek = useUiStore((s) => s.peek);
  const dragHandlers = useDragSelect();

  const highlights = useMemo(() => {
    if (!game) return null;
    return deriveHighlights(game.cells, game.selection, puzzle, {
      showConflicts,
      showMistakes,
    });
  }, [game, puzzle, showConflicts, showMistakes]);

  const peekSets = useMemo(
    () => (game && peek != null ? peekHighlights(game.cells, peek) : null),
    [game, peek],
  );

  // Bitmask per cell of peer-placed digits, to flag impossible pencil marks in red.
  const peerMasks = useMemo(() => (game ? peerDigitMasks(game.cells) : null), [game]);

  if (!game || !highlights || !peerMasks) return null;

  return (
    <div
      className={styles.board}
      role="grid"
      aria-label="Sudoku board"
      {...dragHandlers}
    >
      {game.cells.map((cell, i) => (
        <Cell
          key={i}
          index={i}
          cell={cell}
          selected={highlights.selected.has(i)}
          conflict={highlights.conflicts.has(i)}
          mistake={highlights.mistakes.has(i)}
          sameDigit={peekSets ? false : highlights.sameDigit.has(i)}
          peekSame={peekSets?.same.has(i) ?? false}
          peekElim={peekSets?.elim.has(i) ?? false}
          peerMask={peerMasks[i]}
        />
      ))}
      <SelectionOverlay selection={game.selection} />
    </div>
  );
}
