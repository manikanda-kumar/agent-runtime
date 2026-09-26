import React from 'react';

type G = {color: string; p: number; size?: number};

/** Shared stroke props; `p` drives a dash-offset "drawing in" effect. */
const dash = (p: number, len = 400) => ({
  strokeDasharray: len,
  strokeDashoffset: len * (1 - p),
});

const Svg: React.FC<{size: number; children: React.ReactNode}> = ({
  size,
  children,
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    {children}
  </svg>
);

/** THE MACHINE — a full tower: one kernel, one tenant, maximum weight. */
export const MachineGlyph: React.FC<G> = ({color, p, size = 86}) => (
  <Svg size={size}>
    <rect
      x="24"
      y="10"
      width="52"
      height="80"
      rx="4"
      stroke={color}
      strokeWidth="3"
      {...dash(p, 280)}
    />
    {[24, 38, 52].map((y, i) => (
      <line
        key={y}
        x1="34"
        y1={y + 4}
        x2="66"
        y2={y + 4}
        stroke={color}
        strokeWidth="3"
        opacity={Math.max(0, Math.min(1, (p - 0.35 - i * 0.14) * 6))}
      />
    ))}
    <circle cx="50" cy="76" r="6" stroke={color} strokeWidth="3" opacity={p} />
  </Svg>
);

/** THE PROCESS — stacked images; the artifact is the unit. */
export const ProcessGlyph: React.FC<G> = ({color, p, size = 86}) => (
  <Svg size={size}>
    {[0, 1, 2].map((i) => {
      const o = Math.max(0, Math.min(1, (p - i * 0.2) * 3));
      return (
        <rect
          key={i}
          x={20 + i * 6}
          y={64 - i * 22}
          width="52"
          height="20"
          rx="2"
          stroke={color}
          strokeWidth="3"
          fill={`${color}1f`}
          opacity={o}
          transform={`translate(0, ${(1 - o) * 10})`}
        />
      );
    })}
  </Svg>
);

/** THE EVENT — a bolt: one invocation, scale to zero. */
export const EventGlyph: React.FC<G> = ({color, p, size = 86}) => (
  <Svg size={size}>
    <path
      d="M58 8 L28 54 H48 L42 92 L74 42 H52 Z"
      stroke={color}
      strokeWidth="3"
      fill={`${color}1f`}
      strokeLinejoin="round"
      {...dash(p, 260)}
    />
  </Svg>
);

/** THE ISOLATE — many light contexts inside one process. */
export const IsolateGlyph: React.FC<G> = ({color, p, size = 86}) => (
  <Svg size={size}>
    <rect
      x="12"
      y="20"
      width="76"
      height="60"
      rx="6"
      stroke={color}
      strokeWidth="3"
      {...dash(p, 280)}
    />
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const cx = 26 + (i % 4) * 16;
      const cy = 40 + Math.floor(i / 4) * 20;
      const o = Math.max(0, Math.min(1, (p - 0.3 - i * 0.06) * 8));
      return (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r="5"
          fill={color}
          opacity={o * 0.85}
          transform={`scale(${0.6 + 0.4 * o})`}
          style={{transformOrigin: `${cx}px ${cy}px`}}
        />
      );
    })}
  </Svg>
);

/** THE RECORD — identity + state + mailbox as one addressable thing. */
export const RecordGlyph: React.FC<G> = ({color, p, size = 86}) => (
  <Svg size={size}>
    <circle
      cx="50"
      cy="50"
      r="34"
      stroke={color}
      strokeWidth="3"
      {...dash(p, 220)}
    />
    <ellipse
      cx="50"
      cy="50"
      rx="34"
      ry="12"
      stroke={`${color}99`}
      strokeWidth="2.5"
      opacity={Math.max(0, (p - 0.3) * 1.6)}
    />
    <circle
      cx="50"
      cy="50"
      r="9"
      fill={color}
      opacity={Math.max(0, (p - 0.55) * 2.4)}
    />
  </Svg>
);

export const GLYPHS = [
  MachineGlyph,
  ProcessGlyph,
  EventGlyph,
  IsolateGlyph,
  RecordGlyph,
];
