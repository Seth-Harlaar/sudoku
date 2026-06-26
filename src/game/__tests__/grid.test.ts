import { describe, expect, it } from 'vitest';
import {
  CELL_COUNT,
  PEERS,
  UNITS,
  boxOf,
  colOf,
  indexOf,
  isBoxBottomEdge,
  isBoxRightEdge,
  parseBoard,
  rowOf,
  serializeBoard,
} from '../grid.ts';

describe('grid geometry', () => {
  it('round-trips index <-> (row, col)', () => {
    for (let i = 0; i < CELL_COUNT; i++) {
      expect(indexOf(rowOf(i), colOf(i))).toBe(i);
    }
  });

  it('computes box index correctly', () => {
    expect(boxOf(indexOf(0, 0))).toBe(0);
    expect(boxOf(indexOf(0, 8))).toBe(2);
    expect(boxOf(indexOf(4, 4))).toBe(4);
    expect(boxOf(indexOf(8, 8))).toBe(8);
  });

  it('gives each cell exactly 20 peers', () => {
    for (const peers of PEERS) {
      expect(peers).toHaveLength(20);
      expect(new Set(peers).size).toBe(20);
    }
  });

  it("peers are symmetric (a peer of b => b peer of a)", () => {
    for (let i = 0; i < CELL_COUNT; i++) {
      for (const p of PEERS[i]) {
        expect(PEERS[p]).toContain(i);
      }
    }
  });

  it('has 27 units of 9 cells each', () => {
    expect(UNITS).toHaveLength(27);
    for (const u of UNITS) expect(u).toHaveLength(9);
  });

  it('flags box edges for borders', () => {
    expect(isBoxRightEdge(indexOf(0, 2))).toBe(true);
    expect(isBoxRightEdge(indexOf(0, 3))).toBe(false);
    expect(isBoxBottomEdge(indexOf(2, 0))).toBe(true);
    expect(isBoxBottomEdge(indexOf(3, 0))).toBe(false);
  });
});

describe('board parsing', () => {
  it('parses dots and digits, round-trips', () => {
    const full =
      '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
    expect(serializeBoard(parseBoard(full))).toBe(full);
  });

  it('treats 0 and . as empty', () => {
    expect(parseBoard('0'.repeat(81)).every((d) => d === 0)).toBe(true);
    expect(parseBoard('.'.repeat(81)).every((d) => d === 0)).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(() => parseBoard('1'.repeat(80))).toThrow();
    expect(() => parseBoard('1'.repeat(82))).toThrow();
  });

  it('rejects invalid characters', () => {
    expect(() => parseBoard('x'.repeat(81))).toThrow();
  });
});
