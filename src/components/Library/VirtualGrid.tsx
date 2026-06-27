import { useEffect, useRef, useState, type ReactNode } from 'react';

interface VirtualGridProps<T> {
  items: readonly T[];
  /** Minimum column width in px; column count is derived from container width. */
  minColWidth: number;
  /** Fixed row (card) height in px. */
  rowHeight: number;
  /** Gap between cells in px. */
  gap: number;
  /** Extra rows rendered above/below the viewport to avoid blank flashes. */
  overscanRows?: number;
  className?: string;
  itemKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
}

/**
 * A windowed responsive grid: only the rows intersecting the viewport (plus a small
 * overscan) are mounted, so a 20k-item list renders ~a few dozen nodes. Items are
 * plain in-memory metadata; heavy data is loaded elsewhere, on demand.
 */
export function VirtualGrid<T>({
  items,
  minColWidth,
  rowHeight,
  gap,
  overscanRows = 3,
  className,
  itemKey,
  renderItem,
}: VirtualGridProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const columns = Math.max(1, Math.floor((size.width + gap) / (minColWidth + gap)));
  const rowStride = rowHeight + gap;
  const totalRows = Math.ceil(items.length / columns);
  const totalHeight = totalRows > 0 ? totalRows * rowStride - gap : 0;

  const firstRow = Math.max(0, Math.floor(scrollTop / rowStride) - overscanRows);
  const visibleRows = Math.ceil(size.height / rowStride) + overscanRows * 2;
  const lastRow = Math.min(totalRows, firstRow + visibleRows);

  const start = firstRow * columns;
  const end = Math.min(items.length, lastRow * columns);
  const slice: T[] = [];
  for (let i = start; i < end; i++) slice.push(items[i]);

  return (
    <div
      ref={scrollRef}
      className={className}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      style={{ overflowY: 'auto', position: 'relative' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: firstRow * rowStride,
            left: 0,
            right: 0,
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap,
          }}
        >
          {slice.map((item, k) => (
            <div key={itemKey(item, start + k)} style={{ height: rowHeight }}>
              {renderItem(item, start + k)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
