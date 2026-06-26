import { create } from 'zustand';
import { useLibraryStore } from './libraryStore.ts';

export type Page = 'game' | 'library';

interface ViewStore {
  page: Page;
  go: (page: Page) => void;
}

export const useViewStore = create<ViewStore>((set) => ({
  page: 'game',
  go: (page) => {
    set({ page });
    if (page === 'library') void useLibraryStore.getState().refresh();
  },
}));
