import { create } from 'zustand';
import { useLibraryStore } from './libraryStore.ts';
import { useInProgressStore } from './inProgressStore.ts';

export type Page = 'progress' | 'game' | 'library';

interface ViewStore {
  page: Page;
  go: (page: Page) => void;
}

export const useViewStore = create<ViewStore>((set) => ({
  page: 'progress', // in-progress games are the landing page
  go: (page) => {
    set({ page });
    if (page === 'library') void useLibraryStore.getState().load();
    if (page === 'progress') void useInProgressStore.getState().load();
  },
}));
