# Sudoku PWA — Build Plan

Companion to [REQUIREMENTS.md](REQUIREMENTS.md). This describes the architecture,
data model, and a phased roadmap.

## 1. Tech stack

- **React 18 + TypeScript (strict)**
- **Vite** build, **`vite-plugin-pwa`** (Workbox) for manifest + service worker
- **State**: Zustand (small, fast, no boilerplate) for game + library stores
- **Persistence**: IndexedDB via [`idb`](https://github.com/jakearchibald/idb) wrapper
- **Rendering**: the board as **SVG** (crisp lines, easy hit-testing, scalable) or
  CSS grid of `<div>`s. Leaning **SVG** for the grid lines + overlays, with HTML
  for digits/marks layered on top. Decide in Phase 2 spike.
- **Styling**: CSS Modules or Tailwind (TBD Phase 1); design tokens for theming.
- **Testing**: Vitest for the pure engine + reducers.

## 2. Proposed structure

```
sudoku-pwa/
  index.html
  vite.config.ts            # vite-plugin-pwa config
  package.json / tsconfig.json
  public/                   # icons (maskable), favicons
  src/
    main.tsx, App.tsx
    game/
      types.ts              # Puzzle, GameState, Cell, Mode, Action
      engine.ts             # pure: (state, action) -> state  [tested]
      rules.ts              # conflict detection, win check, candidates
      grid.ts               # index<->(r,c) helpers, peers, boxes
    state/
      gameStore.ts          # active game + undo/redo + selection
      libraryStore.ts       # puzzle index, filters
      settingsStore.ts
    persistence/
      db.ts                 # idb schema: puzzles, progress, settings
      autosave.ts           # debounced progress writes
      durable.ts            # navigator.storage.persist()/estimate()
      backup.ts             # export/import all -> .json
    sources/
      PuzzleSource.ts       # interface
      localFileSource.ts    # File System / file input loader + parsers
      remoteGitSource.ts    # STUB (interface impl, throws "not yet")
    components/
      Board/ Board.tsx, Cell.tsx, Marks.tsx, Selection.tsx
      Controls/ NumberPad.tsx, ModeToggle.tsx, ColorPalette.tsx, ActionBar.tsx
      Timer.tsx, Library/PuzzleList.tsx, Settings/SettingsPanel.tsx, UpdatePrompt.tsx
    hooks/
      useKeyboard.ts, useDragSelect.ts, usePageVisibility.ts
    styles/ tokens.css, themes.css
  src/game/__tests__/        # engine + rules unit tests
```

## 3. Core data model (sketch)

```ts
type Mode = 'normal' | 'corner' | 'center' | 'color';

interface Puzzle {            // immutable definition
  id: string;                 // derived = hash(givens) -> stable id + dedupe
  title?: string;
  author?: string;
  givens: string;             // 81 chars, '.'/'0' = empty
  solution?: string;          // 81 chars, optional (enables exact check)
  clues?: number;             // number of givens (from dataset)
  rating?: number;            // raw numeric difficulty rating (from dataset)
  difficulty?: 'easy'|'medium'|'hard'|'expert'; // bucketed from rating for filters
  source: 'local' | 'remote' | 'builtin';
  addedAt: number;
}

interface Cell {
  value: number | null;       // 1..9
  given: boolean;
  center: number[];           // center pencil marks
  corner: number[];           // corner pencil marks
  color: number | null;       // palette index
}

interface GameState {
  puzzleId: string;
  cells: Cell[];              // length 81
  selection: number[];       // selected cell indices
  mode: Mode;
  undo: Action[]; redo: Action[];
  elapsedMs: number;
  status: 'new' | 'in-progress' | 'solved';
  updatedAt: number;
}

interface Completion {        // one row per finished game (history, append-only)
  id: string;                 // auto (uuid)
  puzzleId: string;           // FK -> Puzzle.id (reference only, not a copy)
  elapsedMs: number;          // completion time
  completedAt: number;        // timestamp
}
```

The **engine** is pure: `apply(state, action) -> state`. UI dispatches actions;
undo/redo just replays/reverts. This keeps logic testable and persistence trivial
(serialize `GameState`).

### Primary data source — Radcliffe "3M Sudoku puzzles with ratings" (Kaggle)

User imports a **downloaded CSV subset** of this dataset. Format:

```text
puzzle,solution,clues,difficulty
.....8.5.3..7......2... (81 chars, '.'=blank) ,4.3... (81 digits 1-9) ,28,2.7
```

- `puzzle` → `givens`, `solution` → `solution`, `clues` → `clues`, `difficulty` → `rating`.
- No id column → `id = hash(givens)` (stable, dedupes on re-import).
- `rating` is continuous (~0 → ~8+); bucket into `difficulty` labels with thresholds
  tuned against a real sample (revisit in Phase 4).
- `localFileSource` includes a small **CSV parser** for this exact schema.

## 4. Persistence design
- IndexedDB stores: `puzzles` (definitions), `progress` (GameState by puzzleId),
  `completions` (finished-game history, indexed by `puzzleId`), `settings`. Library
  index derived from `puzzles` + `progress`; stats derived from `completions`.
- **Autosave**: debounce (~500ms) progress writes on every action.
- **Completion record**: when the engine reports `status: 'solved'`, append one
  `Completion` row (`puzzleId` FK, `elapsedMs`, `completedAt`) — append-only history,
  never overwritten. Aggregate stats (totals, best/avg per difficulty) are computed
  from this store, not stored separately.
- **Durability**: call `navigator.storage.persist()` at first save; show status in
  Settings; `estimate()` for usage.
- **Backup**: a visible **Backup button** (FR-P7) calls `export()`, which dumps all
  four stores to one JSON and downloads it as `sudoku-backup-<date>.json`. The backup is
  **referentially complete** — it includes the full `Puzzle` definition for every puzzle
  referenced by `progress` or `completions`, so a restore can never leave orphaned game
  states (puzzles, not just FK ids, are bundled). `export()` asserts this before writing;
  `import()` restores `puzzles` first, then `progress`/`completions`, validating schema/
  version and rejecting records whose puzzle is absent, then merges or replaces. Implication:
  never hard-delete a `Puzzle` that still has progress/completions (orphan its definition,
  or cascade-delete its progress too). Autosave is continuous; the button is the manual
  external backup.

## 5. Remote git source (deferred, but designed now)
`PuzzleSource` interface = `{ list(): Promise<PuzzleMeta[]>; fetch(id): Promise<Puzzle> }`.
`remoteGitSource` will later fetch an index + per-puzzle files from a public repo
(raw.githubusercontent or GitHub API). For v1 it's a stub that conforms to the
interface so the UI/library code is source-agnostic from day one.

## 6. Phased roadmap

### Phase 0 — Scaffold
Vite + React + TS project, strict tsconfig, `vite-plugin-pwa` with manifest +
icons, base app shell, theming tokens, lint/format, Vitest. **Exit:** installable
empty app that loads offline.

### Phase 1 — Game engine (headless, tested)
`types.ts`, `grid.ts`, `rules.ts`, `engine.ts`. Pure reducer for all actions
(set digit, corner/center mark, color, clear, undo/redo). Conflict + win
detection. Unit tests. **Exit:** engine passes tests, no UI.

### Phase 2 — Board UI + interaction
Board rendering (SVG/HTML spike), cell selection (click, drag, ctrl, shift,
keyboard), all four input modes wired to engine, number pad, mode toggle, color
palette, action bar, conflict + same-digit highlighting, timer. **Exit:** a
hardcoded puzzle is fully playable and looks good on desktop + mobile.

### Phase 3 — Persistence & progress
IndexedDB stores (incl. `completions`), debounced autosave, resume, **completion
recording** on solve (FK + elapsedMs + timestamp), durable storage request, usage
display. **Exit:** refresh/close restores exact state; data survives; finishing a
puzzle writes a completion record.

### Phase 4 — Library & local file loading
Library store + browser UI (filters/search/status), `localFileSource` with the
Radcliffe CSV parser, add/import puzzles, per-puzzle completion history + best-time
display. **Exit:** import puzzles from file, browse, resume any.

### Phase 5 — Backup, stats & polish
Visible **Backup button** + export/import backup `.json`, **statistics view**
(totals, best/avg per difficulty, history), settings panel, update-available prompt,
dark mode, animations, accessibility pass, completion celebration. **Exit:** v1 release.

### Phase 6 — Remote git source (later)
Define the repo format, implement `remoteGitSource`, sync/caching, offline reuse.

## 7. Open items to revisit
- Board rendering: SVG vs HTML grid (Phase 2 spike).
- Styling approach: Tailwind vs CSS Modules (Phase 1).
- Puzzle file format (we own it) — finalize in Phase 4.
- Whether to bundle a few **built-in starter puzzles** so the app is useful on first launch (recommended).
