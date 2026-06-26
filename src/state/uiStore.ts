import { create } from 'zustand';

interface UiStore {
  /** Always-on conflict highlighting (will become a setting in Phase 5). */
  showConflicts: boolean;
  /** Reveal cells that contradict the solution (toggled by the Check button). */
  showMistakes: boolean;
  /** Turn mistake highlighting on. */
  reveal: () => void;
  /** Clear mistake highlighting (e.g. on next input). */
  hideMistakes: () => void;
  /**
   * Transient "peek" digit: while long-pressing a filled cell we highlight every
   * occurrence of its digit plus the cells those occurrences eliminate. Null when
   * not peeking.
   */
  peek: number | null;
  setPeek: (digit: number | null) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  showConflicts: true,
  showMistakes: false,
  reveal: () => set({ showMistakes: true }),
  hideMistakes: () => set((s) => (s.showMistakes ? { showMistakes: false } : s)),
  peek: null,
  setPeek: (digit) => set((s) => (s.peek === digit ? s : { peek: digit })),
}));
