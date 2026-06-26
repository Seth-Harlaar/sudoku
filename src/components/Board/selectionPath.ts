/**
 * Traces the union boundary of a set of selected cells into SVG path strings.
 *
 * Coordinates are in a 9x9 lattice (one unit per cell); cell `i` spans
 * x in [col, col+1], y in [row, row+1]. We emit the clockwise boundary edges of
 * each selected cell (skipping sides shared with another selected cell), then
 * chain them into closed loops. The result is one continuous path per connected
 * region — so inside corners have no gaps, and stroking with a round line-join
 * rounds the corners. Diagonal / disconnected cells yield separate loops.
 */

type Edge = [ax: number, ay: number, bx: number, by: number];

const keyPt = (x: number, y: number) => x * 16 + y;

export function selectionLoops(selection: readonly number[]): string[] {
  const sel = new Set(selection);
  const edges: Edge[] = [];

  for (const i of selection) {
    const c = i % 9;
    const r = Math.floor(i / 9);
    // Clockwise (screen y-down): top, right, bottom, left.
    if (!(r > 0 && sel.has(i - 9))) edges.push([c, r, c + 1, r]);
    if (!(c < 8 && sel.has(i + 1))) edges.push([c + 1, r, c + 1, r + 1]);
    if (!(r < 8 && sel.has(i + 9))) edges.push([c + 1, r + 1, c, r + 1]);
    if (!(c > 0 && sel.has(i - 1))) edges.push([c, r + 1, c, r]);
  }

  // Index edges by their start point so we can chain them.
  const byStart = new Map<number, number[]>();
  edges.forEach((e, idx) => {
    const k = keyPt(e[0], e[1]);
    const arr = byStart.get(k);
    if (arr) arr.push(idx);
    else byStart.set(k, [idx]);
  });

  const used = new Array<boolean>(edges.length).fill(false);
  const loops: string[] = [];

  for (let s = 0; s < edges.length; s++) {
    if (used[s]) continue;
    const pts: Array<[number, number]> = [];
    let curr: number = s;
    while (curr !== -1 && !used[curr]) {
      used[curr] = true;
      const e = edges[curr];
      pts.push([e[0], e[1]]);
      const cands = (byStart.get(keyPt(e[2], e[3])) ?? []).filter((j) => !used[j]);
      if (cands.length === 0) curr = -1; // loop closes back to start
      else if (cands.length === 1) curr = cands[0];
      else curr = pickNext(cands, e, edges); // junction: keep the tightest turn
    }
    if (pts.length >= 2) {
      const simp = dropCollinear(pts);
      loops.push('M' + simp.map(([x, y]) => `${x} ${y}`).join('L') + 'Z');
    }
  }
  return loops;
}

/** Drop collinear vertices from a closed loop so only real corners remain. */
function dropCollinear(pts: Array<[number, number]>): Array<[number, number]> {
  const n = pts.length;
  if (n < 3) return pts;
  const keep: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const [px, py] = pts[(i - 1 + n) % n];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[(i + 1) % n];
    const cross = (cx - px) * (ny - cy) - (cy - py) * (nx - cx);
    if (cross !== 0) keep.push(pts[i]);
  }
  return keep.length >= 2 ? keep : pts;
}

/** At a shared vertex, prefer the right-most (most clockwise) turn to keep loops simple. */
function pickNext(cands: number[], inEdge: Edge, edges: Edge[]): number {
  const dinx = inEdge[2] - inEdge[0];
  const diny = inEdge[3] - inEdge[1];
  let best = cands[0];
  let bestRank = 99;
  for (const j of cands) {
    const e = edges[j];
    const dx = e[2] - e[0];
    const dy = e[3] - e[1];
    const cross = dinx * dy - diny * dx;
    const dot = dinx * dx + diny * dy;
    // right turn (0) < straight (1) < left turn (2) < reverse (3)
    const rank = cross > 0 ? 0 : cross < 0 ? 2 : dot > 0 ? 1 : 3;
    if (rank < bestRank) {
      bestRank = rank;
      best = j;
    }
  }
  return best;
}
