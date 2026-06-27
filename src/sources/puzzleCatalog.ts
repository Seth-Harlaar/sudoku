/**
 * Lazy access to the bundled base set (the ~20k puzzles under `public/puzzles/`).
 *
 * `index.json` is a light catalog — `[id, clues, rating]` per puzzle in chunk order —
 * loaded once so the library can search / filter / sort everything without ever
 * holding 20k full boards in memory. The heavy `givens`/`solution` strings live in
 * fixed-size `chunk-NNN.csv` files and are fetched (and LRU-cached) only when a
 * specific puzzle is opened.
 */

import type { Difficulty, Puzzle } from '../game/types.ts';
import { bucketDifficulty } from '../game/puzzle.ts';
import { parseRadcliffeCsv } from './csv.ts';

/** A light catalog record — enough to list/filter without loading the board. */
export interface CatalogMeta {
  id: string;
  clues: number;
  rating: number;
  difficulty: Difficulty | undefined;
  /** Global position in the catalog; maps to a chunk file + offset. */
  index: number;
}

interface Manifest {
  chunkSize: number;
  count: number;
  puzzles: [id: string, clues: number, rating: number][];
}

/** Keep at most this many parsed chunks (~500 puzzles each) resident. */
const MAX_CACHED_CHUNKS = 6;

const base = import.meta.env.BASE_URL;
const url = (file: string) => `${base}puzzles/${file}`;

let manifestPromise: Promise<Manifest> | null = null;
let catalogPromise: Promise<CatalogMeta[]> | null = null;
const chunkCache = new Map<number, Promise<Puzzle[]>>();

async function loadManifest(): Promise<Manifest> {
  if (!manifestPromise) {
    manifestPromise = fetch(url('index.json')).then((r) => {
      if (!r.ok) throw new Error(`catalog index: ${r.status}`);
      return r.json() as Promise<Manifest>;
    });
  }
  return manifestPromise;
}

/** Load (once) the light catalog of every base-set puzzle. */
export async function loadCatalog(): Promise<CatalogMeta[]> {
  if (!catalogPromise) {
    catalogPromise = loadManifest().then((m) =>
      m.puzzles.map(([id, clues, rating], index) => ({
        id,
        clues,
        rating,
        difficulty: bucketDifficulty(rating),
        index,
      })),
    );
  }
  return catalogPromise;
}

function chunkFile(chunkIndex: number): string {
  return `chunk-${String(chunkIndex).padStart(3, '0')}.csv`;
}

async function loadChunk(chunkIndex: number): Promise<Puzzle[]> {
  let pending = chunkCache.get(chunkIndex);
  if (!pending) {
    pending = fetch(url(chunkFile(chunkIndex)))
      .then((r) => {
        if (!r.ok) throw new Error(`catalog ${chunkFile(chunkIndex)}: ${r.status}`);
        return r.text();
      })
      .then((text) => parseRadcliffeCsv(text).puzzles);
    chunkCache.set(chunkIndex, pending);
  } else {
    // Touch for LRU recency.
    chunkCache.delete(chunkIndex);
    chunkCache.set(chunkIndex, pending);
  }
  // Evict least-recently-used chunks beyond the cap.
  while (chunkCache.size > MAX_CACHED_CHUNKS) {
    const oldest = chunkCache.keys().next().value;
    if (oldest === undefined) break;
    chunkCache.delete(oldest);
  }
  return pending;
}

/** Fetch the full puzzle (with board + solution) at a global catalog index. */
export async function getCatalogPuzzle(index: number): Promise<Puzzle> {
  const { chunkSize } = await loadManifest();
  const chunk = await loadChunk(Math.floor(index / chunkSize));
  const puzzle = chunk[index % chunkSize];
  if (!puzzle) throw new Error(`catalog puzzle ${index} not found`);
  return puzzle;
}
