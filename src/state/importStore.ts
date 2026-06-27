import { create } from 'zustand';
import type { Puzzle } from '../game/types.ts';
import { CELL_COUNT, serializeBoard } from '../game/grid.ts';
import { makePuzzleId } from '../game/puzzle.ts';
import { importPuzzles } from '../persistence/db.ts';
import { parseSudokuImage } from '../sources/ocr/parseSudokuImage.ts';

/** Below this OCR confidence a recognized digit is flagged for the user to verify. */
const UNCERTAIN_BELOW = 0.7;

interface ImportStore {
  /** Object URL of the picked image (null when no import is in flight). */
  imageUrl: string | null;
  digits: (number | null)[];
  uncertain: boolean[];
  name: string;
  parsing: boolean;
  error: string | null;

  /** Start an image import: show the picture immediately, then OCR it. */
  begin: (file: File) => Promise<void>;
  setDigits: (next: (number | null)[]) => void;
  setName: (name: string) => void;
  /** Persist the edited puzzle to the library. Returns it, or null if invalid. */
  complete: () => Promise<Puzzle | null>;
  reset: () => void;
}

const blank = (): (number | null)[] => new Array<number | null>(CELL_COUNT).fill(null);

export const useImportStore = create<ImportStore>((set, get) => ({
  imageUrl: null,
  digits: blank(),
  uncertain: new Array<boolean>(CELL_COUNT).fill(false),
  name: '',
  parsing: false,
  error: null,

  begin: async (file) => {
    get().reset();
    const imageUrl = URL.createObjectURL(file);
    set({ imageUrl, parsing: true, error: null, digits: blank(), name: '' });
    try {
      const { digits, confidence } = await parseSudokuImage(file);
      const uncertain = digits.map((d, i) => d != null && confidence[i] < UNCERTAIN_BELOW);
      set({ digits, uncertain, parsing: false });
    } catch (e) {
      set({ parsing: false, error: e instanceof Error ? e.message : 'Could not read image' });
    }
  },

  setDigits: (digits) => set({ digits }),
  setName: (name) => set({ name }),

  complete: async () => {
    const { digits, name } = get();
    if (digits.every((d) => d == null)) return null; // nothing to import
    const givens = serializeBoard(digits.map((d) => d ?? 0));
    const clues = digits.filter((d) => d != null).length;
    const puzzle: Puzzle = {
      id: makePuzzleId(givens),
      title: name.trim() || `Imported puzzle`,
      givens,
      clues,
      source: 'local',
      addedAt: Date.now(),
    };
    await importPuzzles([puzzle]);
    return puzzle;
  },

  reset: () => {
    const url = get().imageUrl;
    if (url) URL.revokeObjectURL(url);
    set({
      imageUrl: null,
      digits: blank(),
      uncertain: new Array<boolean>(CELL_COUNT).fill(false),
      name: '',
      parsing: false,
      error: null,
    });
  },
}));
