/**
 * Grid geometry helpers for a standard 9x9 Sudoku. Cells are addressed by a
 * row-major index 0..80; (row, col) are 0..8. All lookup tables are precomputed.
 */

export const SIZE = 9;
export const CELL_COUNT = SIZE * SIZE; // 81
export const BOX = 3;

export const clamp = (n: number, lo: number, hi: number): number =>
  n < lo ? lo : n > hi ? hi : n;

export const rowOf = (i: number): number => Math.floor(i / SIZE);
export const colOf = (i: number): number => i % SIZE;
export const boxOf = (i: number): number =>
  Math.floor(rowOf(i) / BOX) * BOX + Math.floor(colOf(i) / BOX);
export const indexOf = (row: number, col: number): number => row * SIZE + col;

export const ALL_INDICES: readonly number[] = Array.from(
  { length: CELL_COUNT },
  (_, i) => i,
);

/** Indices sharing a row, column, or box with `i` (excluding `i` itself). */
export const PEERS: readonly (readonly number[])[] = ALL_INDICES.map((i) => {
  const peers = new Set<number>();
  for (let j = 0; j < CELL_COUNT; j++) {
    if (j === i) continue;
    if (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i)) {
      peers.add(j);
    }
  }
  return [...peers];
});

/** The 27 units (9 rows, 9 columns, 9 boxes), each a list of 9 indices. */
export const UNITS: readonly (readonly number[])[] = (() => {
  const units: number[][] = [];
  for (let r = 0; r < SIZE; r++) {
    units.push(ALL_INDICES.filter((i) => rowOf(i) === r));
  }
  for (let c = 0; c < SIZE; c++) {
    units.push(ALL_INDICES.filter((i) => colOf(i) === c));
  }
  for (let b = 0; b < SIZE; b++) {
    units.push(ALL_INDICES.filter((i) => boxOf(i) === b));
  }
  return units;
})();

/** True when `i` sits on the right edge of a 3x3 box (for thick borders). */
export const isBoxRightEdge = (i: number): boolean => colOf(i) % BOX === BOX - 1;
/** True when `i` sits on the bottom edge of a 3x3 box. */
export const isBoxBottomEdge = (i: number): boolean => rowOf(i) % BOX === BOX - 1;

/**
 * Parse an 81-char givens/solution string into a digit array (0 = empty).
 * Accepts '.', '0', and spaces as empty. Throws if length != 81 or invalid chars.
 */
export function parseBoard(s: string): number[] {
  const cleaned = s.trim();
  if (cleaned.length !== CELL_COUNT) {
    throw new Error(`Board must be ${CELL_COUNT} chars, got ${cleaned.length}`);
  }
  const out: number[] = [];
  for (const ch of cleaned) {
    if (ch === '.' || ch === '0' || ch === ' ') {
      out.push(0);
    } else if (ch >= '1' && ch <= '9') {
      out.push(ch.charCodeAt(0) - 48);
    } else {
      throw new Error(`Invalid board character: ${JSON.stringify(ch)}`);
    }
  }
  return out;
}

/** Serialize a digit array back to an 81-char string ('.' for 0). */
export function serializeBoard(digits: readonly number[]): string {
  return digits.map((d) => (d === 0 ? '.' : String(d))).join('');
}
