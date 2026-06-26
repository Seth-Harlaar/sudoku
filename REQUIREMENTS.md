# Sudoku PWA — Requirements

> A polished, installable Progressive Web App for playing classic Sudoku.
> Gameplay and layout modeled on **SudokuPad** (online version), but with a cleaner,
> better-looking UI. Progress is tracked per-game and persisted durably.

## Locked decisions (v1)

| Area | Decision |
|------|----------|
| Puzzle scope | **Classic 9×9 only** for v1. Variant constraints (thermos, cages, arrows…) are out of scope but the data model leaves room. |
| Tech stack | **React 18 + TypeScript + Vite**, `vite-plugin-pwa` for the service worker/manifest. |
| Remote source | **Stubbed** behind an interface for v1; format/repo decided later. |
| Persistence | **IndexedDB** + `navigator.storage.persist()` to resist eviction, **plus** full export/import to a `.json` file the user controls. |

---

## 1. Functional requirements

### 1.1 Gameplay (SudokuPad-style core)
- **FR-G1** Render a 9×9 grid with bold 3×3 box borders and thin cell borders.
- **FR-G2** **Given** (clue) digits are visually distinct and immutable.
- **FR-G3** Cell **selection**:
  - Click to select a single cell.
  - Click-drag to select multiple cells (paint selection).
  - `Ctrl`/`Cmd`+click to add/remove individual cells.
  - `Shift`+click or arrow+`Shift` to extend selection.
  - Click empty space / `Esc` to deselect.
- **FR-G4** Four **input modes** (mirroring SudokuPad):
  - **Normal** — places a big digit in the cell.
  - **Corner** — small pencil marks in cell corners (multiple per cell).
  - **Center** — small pencil marks centered (multiple per cell).
  - **Color** — applies a highlight color to the cell(s).
- **FR-G5** **Number pad** (1–9) plus mode toggle buttons, delete, undo, redo, check.
- **FR-G6** **Keyboard support**:
  - Arrow keys move/extend selection.
  - `1`–`9` enter a digit in the active mode.
  - Mode modifiers: `Shift` = corner, `Ctrl` = center (configurable), or dedicated mode keys.
  - `Backspace`/`Delete` clears value/marks, `Ctrl+Z` / `Ctrl+Y` undo/redo.
- **FR-G7** **Color palette** (e.g. 9–10 swatches) for the Color mode.
- **FR-G8** **Undo / redo** across all actions (digits, marks, colors, clears).
- **FR-G9** **Clear/restart** the current puzzle back to its givens.
- **FR-G10** **Auto pencil-mark cleanup** *(optional v1.1)*: removing a candidate from peers when a digit is placed (toggleable).
- **FR-G11** **Conflict highlighting**: cells that violate row/column/box uniqueness are flagged (toggleable).
- **FR-G12** **Check / validate**: verify the current board against the solution (or by rule), report completion or errors.
- **FR-G13** **Win detection**: when the board is correctly and fully filled, show a completion state (time, animation).
- **FR-G14** **Timer**: counts play time per puzzle, pauses when the game is hidden/backgrounded.
- **FR-G15** **Highlight same digit**: selecting/entering a digit optionally highlights all matching digits (SudokuPad behavior).

### 1.2 Puzzle library & loading
- **FR-L1** Maintain a **library** of puzzles with metadata: id, title, author, difficulty, source, date added, completion status, best time.
- **FR-L2** **Load from local file**: import a puzzle (or batch) from a file the user picks.
  Primary format is the **Radcliffe "3M Sudoku puzzles with ratings" CSV** (columns
  `puzzle,solution,clues,difficulty`; `.` = blank). A subset CSV is downloaded by the user
  and imported; ids are derived by hashing the puzzle string (auto-dedupe).
- **FR-L3** **Remote git source** *(stubbed v1)*: a `PuzzleSource` interface so a remote-repo loader can be dropped in later without touching the UI.
- **FR-L4** **Library browser UI**: list/grid of puzzles with filters (difficulty, completed/in-progress/new) and search.
- **FR-L5** **Resume**: opening an in-progress puzzle restores its exact state (digits, marks, colors, selection, timer).

### 1.3 Progress & persistence
- **FR-P1** Persist **per-puzzle progress** automatically (debounced) as the user plays.
- **FR-P2** Persist the **library index** and **app settings**.
- **FR-P3** Request **durable storage** via `navigator.storage.persist()` and surface its status to the user.
- **FR-P4** **Export all data** to a single `.json` backup file. The backup is
  **self-contained / referentially complete**: it includes the **full puzzle definition**
  for every puzzle that has progress (a GameState) **or** a completion record — so a
  restore never produces orphaned game states with no puzzle to show. Concretely the
  export bundles the `puzzles`, `progress`, `completions`, and `settings` stores, and
  validates on export that every `puzzleId` referenced by progress/completions resolves
  to an included puzzle (warn + auto-include if a referenced puzzle is missing).
- **FR-P5** **Import** a backup file, merging or replacing existing data (with confirmation).
  Import restores puzzle definitions first, then progress/completions, and rejects or
  flags any record whose referenced puzzle is absent.
- **FR-P6** Show **storage usage** estimate (`navigator.storage.estimate()`).
- **FR-P7** **Backup button**: a clearly visible action (in the library/app header or Settings)
  that triggers FR-P4 on demand, downloading the backup as a timestamped file
  (e.g. `sudoku-backup-2026-06-25.json`). Autosave still runs continuously; this is the
  manual, user-controlled external backup.

### 1.4 Statistics
- **FR-ST1** On **game completion** (correct + fully filled), record a **completion record**:
  `puzzleId` (FK reference to the puzzle — not a copy of the puzzle), `elapsedMs`
  (completion time), `completedAt` (timestamp). Multiple completions of the same puzzle
  are each recorded (history), not overwritten.
- **FR-ST2** Derive and display **aggregate stats**: total puzzles solved, best/average
  completion time (overall and per difficulty bucket), and a streak/recent-completions list.
- **FR-ST3** **Per-puzzle** view shows that puzzle's completion history and best time.
- **FR-ST4** Completion records are included in backup/export (FR-P4) and importable (FR-P5).

### 1.5 PWA / app shell
- **FR-A1** **Installable**: valid web app manifest, icons (maskable), theme color.
- **FR-A2** **Offline-capable**: service worker caches the app shell; the app fully works offline once loaded.
- **FR-A3** **Responsive**: works on desktop (grid + side controls) and mobile (grid + bottom controls), touch-friendly hit targets.
- **FR-A4** **Update flow**: prompt the user when a new service-worker version is available.

### 1.6 Settings
- **FR-S1** Toggles for: conflict highlighting, same-digit highlight, auto pencil-mark cleanup, timer visibility, theme (light/dark/system).
- **FR-S2** Settings persisted and applied on load.

---

## 2. Non-functional requirements
- **NFR-1 Performance**: grid interactions (select, input) feel instant (<16ms render budget); no jank on drag-select.
- **NFR-2 Look & feel**: clean, modern, "looks good" — the explicit improvement over SudokuPad. Consistent spacing, typography, smooth transitions, dark mode.
- **NFR-3 Accessibility**: keyboard-fully-playable, focus states, sufficient contrast, ARIA where reasonable.
- **NFR-4 Reliability**: no data loss — writes are atomic and debounced; corrupt data degrades gracefully.
- **NFR-5 Type safety**: strict TypeScript, no `any` in core game logic.
- **NFR-6 Testability**: pure game engine (input → new state) is unit-tested.
- **NFR-7 Offline-first**: zero network required for core play.

---

## 3. Explicitly out of scope for v1
- Variant constraints (thermometers, killer cages, arrows, kropki, etc.).
- Puzzle generation (we import/curate puzzles; generation can come later).
- Multiplayer / shared sessions / accounts.
- Live remote-repo sync (interface only; implementation deferred).
