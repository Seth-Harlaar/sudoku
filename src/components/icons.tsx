import type { SVGProps } from 'react';

/** Shared base: 24px grid, scales with font-size, inherits color via currentColor. */
function Svg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      {...props}
    />
  );
}

export function IconUndo(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M9 7 4 12l5 5" />
      <path d="M4 12h11a5 5 0 0 1 0 10h-1" />
    </Svg>
  );
}

export function IconRedo(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M15 7l5 5-5 5" />
      <path d="M20 12H9a5 5 0 0 0 0 10h1" />
    </Svg>
  );
}

export function IconErase(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </Svg>
  );
}

export function IconCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

/** Normal mode — a pencil (places a full digit). */
export function IconNormal(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Svg>
  );
}

/** Corner mode — four dots in the cell corners. */
export function IconCorner(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <g fill="currentColor" stroke="none">
        <circle cx="7" cy="7" r="1.4" />
        <circle cx="17" cy="7" r="1.4" />
        <circle cx="7" cy="17" r="1.4" />
        <circle cx="17" cy="17" r="1.4" />
      </g>
    </Svg>
  );
}

/** Center mode — three dots clustered in the middle. */
export function IconCenter(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <g fill="currentColor" stroke="none">
        <circle cx="8.5" cy="12" r="1.4" />
        <circle cx="12" cy="12" r="1.4" />
        <circle cx="15.5" cy="12" r="1.4" />
      </g>
    </Svg>
  );
}

/** Color mode — a paint droplet. */
export function IconColor(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5S12.5 5.5 12 3c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7z" />
    </Svg>
  );
}

export function IconSun(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  );
}

export function IconMoon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </Svg>
  );
}

/** New puzzle — a die face. */
export function IconDice(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <g fill="currentColor" stroke="none">
        <circle cx="8" cy="8" r="1.3" />
        <circle cx="16" cy="8" r="1.3" />
        <circle cx="12" cy="12" r="1.3" />
        <circle cx="8" cy="16" r="1.3" />
        <circle cx="16" cy="16" r="1.3" />
      </g>
    </Svg>
  );
}

/** Sudoku — a 3x3 grid. */
export function IconGrid(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </Svg>
  );
}

/** In progress — a clock face. */
export function IconClock(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  );
}

export function IconLibrary(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Svg>
  );
}

/** Import — arrow down into a tray. */
export function IconImport(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </Svg>
  );
}

/** Import from image — a picture with a sun + mountain. */
export function IconImage(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </Svg>
  );
}

export function IconClose(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Svg>
  );
}

export function IconSearch(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </Svg>
  );
}

/** Brand mark — a mini sudoku grid on an accent tile. */
export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden
      focusable={false}
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" fill="var(--accent)" />
      <g stroke="#fff" strokeWidth="1.3" opacity="0.92" strokeLinecap="round">
        <line x1="2" y1="8.7" x2="22" y2="8.7" />
        <line x1="2" y1="15.3" x2="22" y2="15.3" />
        <line x1="8.7" y1="2" x2="8.7" y2="22" />
        <line x1="15.3" y1="2" x2="15.3" y2="22" />
      </g>
    </svg>
  );
}
