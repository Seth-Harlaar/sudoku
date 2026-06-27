import { useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { clamp } from '../../game/grid.ts';
import styles from './ZoomPanImage.module.css';

interface Props {
  src: string;
  alt?: string;
  className?: string;
}

interface Transform {
  scale: number;
  x: number;
  y: number;
}

const MIN = 1;
const MAX = 8;
const IDENTITY: Transform = { scale: 1, x: 0, y: 0 };

/** Zoom toward (cx, cy) by `factor`, keeping that screen point fixed. */
function zoomAt(t: Transform, factor: number, cx: number, cy: number): Transform {
  const scale = clamp(t.scale * factor, MIN, MAX);
  const k = scale / t.scale;
  return { scale, x: cx - (cx - t.x) * k, y: cy - (cy - t.y) * k };
}

/**
 * A pan/zoom image surface — mouse wheel + double-click on desktop, drag to pan, and
 * two-finger pinch on touch. No dependencies; uses pointer events so one path covers
 * mouse, pen and touch.
 */
export function ZoomPanImage({ src, alt, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDist = useRef<number | null>(null);
  const [t, setT] = useState<Transform>(IDENTITY);

  const local = (e: { clientX: number; clientY: number }) => {
    const rect = ref.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const { x, y } = local(e);
    setT((prev) => zoomAt(prev, Math.exp(-e.deltaY * 0.0015), x, y));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) pinchDist.current = pairDistance();
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const prevPt = pointers.current.get(e.pointerId);
    if (!prevPt) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchDist.current != null) {
      const dist = pairDistance();
      const mid = pairMidpoint();
      const rect = ref.current!.getBoundingClientRect();
      setT((prev) =>
        zoomAt(prev, dist / pinchDist.current!, mid.x - rect.left, mid.y - rect.top),
      );
      pinchDist.current = dist;
      return;
    }
    setT((prev) => ({ ...prev, x: prev.x + (e.clientX - prevPt.x), y: prev.y + (e.clientY - prevPt.y) }));
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchDist.current = null;
  };

  function pairDistance(): number {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function pairMidpoint(): { x: number; y: number } {
    const [a, b] = [...pointers.current.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  return (
    <div className={`${styles.viewport} ${className ?? ''}`}>
      <div
        ref={ref}
        className={styles.surface}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => setT(IDENTITY)}
        style={{ cursor: t.scale > 1 ? 'grab' : 'default' }}
      >
        <img
          className={styles.img}
          src={src}
          alt={alt ?? 'Imported puzzle'}
          draggable={false}
          style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.scale})` }}
        />
      </div>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.zoomBtn}
          aria-label="Zoom out"
          onClick={() => setT((p) => zoomAt(p, 1 / 1.4, refCenter().x, refCenter().y))}
        >
          −
        </button>
        <button
          type="button"
          className={styles.zoomBtn}
          aria-label="Reset zoom"
          onClick={() => setT(IDENTITY)}
        >
          {Math.round(t.scale * 100)}%
        </button>
        <button
          type="button"
          className={styles.zoomBtn}
          aria-label="Zoom in"
          onClick={() => setT((p) => zoomAt(p, 1.4, refCenter().x, refCenter().y))}
        >
          +
        </button>
      </div>
    </div>
  );

  function refCenter(): { x: number; y: number } {
    const rect = ref.current?.getBoundingClientRect();
    return rect ? { x: rect.width / 2, y: rect.height / 2 } : { x: 0, y: 0 };
  }
}
