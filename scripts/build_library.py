#!/usr/bin/env python3
"""Split the sampled base set (genesis) into the app's lazy-loadable library.

Reads assets/genesis.csv (id,puzzle,solution,clues,difficulty) and writes, into
public/puzzles/:

  index.json   a light catalog: chunkSize + [[id, clues, rating], ...] for every
               puzzle, in chunk order. ~1MB; loaded once so the library can
               search / filter / sort all 20k without touching the boards.
  chunk-NNN.csv  fixed-size slices (CHUNK_SIZE rows) of the full puzzles. The app
               fetches a single chunk only when a puzzle is opened.

Re-run after regenerating genesis. Output is deterministic.

Usage:
    python scripts/build_library.py            # defaults below
    python scripts/build_library.py SRC OUTDIR
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

SRC = Path("assets/genesis.csv")
OUT = Path("public/puzzles")
CHUNK_SIZE = 500

HEADER = ["id", "puzzle", "solution", "clues", "difficulty"]


def main() -> int:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else SRC
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else OUT

    if not src.exists():
        print(f"error: source not found: {src}", file=sys.stderr)
        return 1

    out.mkdir(parents=True, exist_ok=True)
    # Clear any stale chunks from a previous (differently-sized) run.
    for old in out.glob("chunk-*.csv"):
        old.unlink()

    index: list[list[object]] = []
    chunk_count = 0
    rows: list[list[str]] = []

    def flush(idx: int) -> None:
        nonlocal chunk_count
        path = out / f"chunk-{idx:03d}.csv"
        with path.open("w", newline="") as f:
            w = csv.writer(f)
            w.writerow(HEADER)
            w.writerows(rows)
        chunk_count = idx + 1

    with src.open(newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        assert header == HEADER, f"unexpected header: {header}"
        for row in reader:
            rows.append(row)
            # row = [id, puzzle, solution, clues, difficulty(rating)]
            index.append([row[0], int(row[3]), float(row[4])])
            if len(rows) == CHUNK_SIZE:
                flush(len(index) // CHUNK_SIZE - 1)
                rows = []
        if rows:
            flush(len(index) // CHUNK_SIZE)

    manifest = {"chunkSize": CHUNK_SIZE, "count": len(index), "puzzles": index}
    (out / "index.json").write_text(json.dumps(manifest, separators=(",", ":")))

    size = (out / "index.json").stat().st_size
    print(f"wrote {chunk_count} chunks + index.json ({size/1e6:.2f} MB) "
          f"for {len(index)} puzzles -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
