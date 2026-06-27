import { useMemo } from 'react';
import { useImportStore } from '../../state/importStore.ts';
import { useLibraryStore } from '../../state/libraryStore.ts';
import { useViewStore } from '../../state/viewStore.ts';
import { PuzzleEditor } from '../PuzzleEditor/PuzzleEditor.tsx';
import { IconCheck, IconClose } from '../icons.tsx';
import { ZoomPanImage } from './ZoomPanImage.tsx';
import styles from './ImportReviewPage.module.css';

export function ImportReviewPage() {
  const imageUrl = useImportStore((s) => s.imageUrl);
  const digits = useImportStore((s) => s.digits);
  const uncertain = useImportStore((s) => s.uncertain);
  const name = useImportStore((s) => s.name);
  const parsing = useImportStore((s) => s.parsing);
  const error = useImportStore((s) => s.error);
  const setDigits = useImportStore((s) => s.setDigits);
  const setName = useImportStore((s) => s.setName);
  const complete = useImportStore((s) => s.complete);
  const reset = useImportStore((s) => s.reset);

  const reload = useLibraryStore((s) => s.reload);
  const go = useViewStore((s) => s.go);

  const filled = useMemo(() => digits.filter((d) => d != null).length, [digits]);
  const flagged = useMemo(
    () => uncertain.reduce((n, u, i) => n + (u && digits[i] != null ? 1 : 0), 0),
    [uncertain, digits],
  );

  const cancel = () => {
    reset();
    go('library');
  };

  const finish = async () => {
    const puzzle = await complete();
    if (!puzzle) return;
    await reload();
    reset();
    go('library');
  };

  if (!imageUrl) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <p>No image to import.</p>
          <button className={styles.secondary} onClick={() => go('library')}>
            Back to library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.iconBtn} onClick={cancel} aria-label="Cancel import">
          <IconClose />
        </button>
        <input
          className={styles.name}
          type="text"
          placeholder="Puzzle name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Puzzle name"
        />
        <button
          className={styles.complete}
          onClick={() => void finish()}
          disabled={parsing || filled === 0}
        >
          <IconCheck className={styles.completeIcon} />
          Complete
        </button>
      </header>

      <div className={styles.status}>
        {parsing
          ? 'Reading puzzle from image…'
          : error
            ? `Couldn't read the image: ${error}. Enter the puzzle by hand below.`
            : `${filled} cells detected${flagged ? ` · ${flagged} to double-check (highlighted)` : ''}`}
      </div>

      <div className={styles.split}>
        <div className={styles.imagePane}>
          <ZoomPanImage src={imageUrl} alt="Imported puzzle screenshot" />
        </div>
        <div className={styles.editorPane}>
          <PuzzleEditor value={digits} onChange={setDigits} uncertain={uncertain} />
        </div>
      </div>
    </div>
  );
}
