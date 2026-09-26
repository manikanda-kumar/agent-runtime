import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate, Easing} from 'remotion';
import {Background} from '../components/Background';
import {SceneLabel} from '../components/Chrome';
import {MONO, SANS, FG, FG2, DIM, LINE, CYAN, AMBER} from '../theme';
import {reveal, pop, window_} from '../components/anim';

type Tier = {
  tier: string;
  example: string;
  iso: string;
  latency: string;
  blast: number; // 0..1 blast radius per operation
};

const TIERS: Tier[] = [
  {tier: 'interpreter', example: 'just-bash', iso: 'language-level', latency: 'µs', blast: 0.12},
  {tier: 'isolate', example: 'V8 / Worker Loader', iso: 'V8 sandbox', latency: '~ms', blast: 0.38},
  {tier: 'container', example: 'gVisor / Kata', iso: 'user-space kernel', latency: '~100ms', blast: 0.7},
  {tier: 'microVM', example: 'Firecracker', iso: 'hardware (KVM)', latency: '~125ms', blast: 1},
];

const BOX_W = 250;
const GAP = 20;
const LEFT = 110;
const BOX_TOP = 172;
const BOX_H = 244;
const CX = (i: number) => LEFT + i * (BOX_W + GAP) + BOX_W / 2;

// The slider dwells on each tier, then eases to the next.
const DWELL_START = 46;
const DWELL = 62;

export const Gradient: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame - DWELL_START;
  const active = Math.max(0, Math.min(3, Math.floor(t / DWELL)));
  const seg = Math.max(0, Math.min(1, (t % DWELL) / (DWELL * 0.55)));
  const eased = Easing.inOut(Easing.cubic)(seg);
  const blastNow = interpolate(
    t < 0 ? 0 : Math.min(3, active + eased),
    [0, 1, 2, 3],
    TIERS.map((x) => x.blast)
  );

  return (
    <AbsoluteFill>
      <Background tint="#0d3040" />
      <SceneLabel index="03" text="the isolation gradient" />

      {TIERS.map((tr, i) => {
        const at = 8 + i * 14;
        const s = pop(frame, at);
        const isActive = t >= 0 && i === active;
        const color = isActive ? (i === 3 ? AMBER : CYAN) : LINE;
        return (
          <div
            key={tr.tier}
            style={{
              position: 'absolute',
              left: LEFT + i * (BOX_W + GAP),
              top: BOX_TOP,
              width: BOX_W,
              height: BOX_H,
              boxSizing: 'border-box',
              border: `1px solid ${isActive ? color : LINE}`,
              borderTop: `3px solid ${isActive ? color : '#263142'}`,
              background: isActive ? 'rgba(18,26,37,0.9)' : 'rgba(11,15,22,0.72)',
              boxShadow: isActive ? `0 0 26px ${color}33` : 'none',
              padding: '18px 20px',
              opacity: Math.min(1, s * 1.3),
              transform: `translateY(${(1 - s) * 30}px) scale(${isActive ? 1.035 : 1})`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 11.5,
                letterSpacing: 2.4,
                color: DIM,
              }}
            >
              {`TIER 0${i + 1}`}
            </div>
            <div
              style={{
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: 25,
                color: isActive ? FG : '#8e9aa9',
                marginTop: 8,
              }}
            >
              {tr.tier}
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 14,
                color: isActive ? (i === 3 ? AMBER : CYAN) : DIM,
                marginTop: 10,
              }}
            >
              {tr.example}
            </div>

            {/* nested squares: heavier tier = more layers of isolation */}
            <div style={{position: 'relative', height: 62, marginTop: 16}}>
              {Array.from({length: i + 1}).map((_, k) => (
                <div
                  key={k}
                  style={{
                    position: 'absolute',
                    left: k * 9,
                    top: k * 7,
                    width: 56 - k * 4,
                    height: 44 - k * 6,
                    border: `1.5px solid ${isActive ? color : '#2a3547'}`,
                    background: isActive ? `${color}14` : 'transparent',
                    opacity: reveal(frame, at + 14 + k * 6, 14),
                  }}
                />
              ))}
            </div>

            <div
              style={{
                fontFamily: MONO,
                fontSize: 12.5,
                color: DIM,
                marginTop: 4,
                lineHeight: 1.6,
              }}
            >
              {tr.iso}
              <br />
              <span style={{color: isActive ? FG2 : DIM}}>start {tr.latency}</span>
            </div>
          </div>
        );
      })}

      {/* ---- blast-radius slider ---- */}
      <div
        style={{
          position: 'absolute',
          left: LEFT,
          top: 470,
          width: 1060,
          opacity: reveal(frame, 34, 20),
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 12.5,
            letterSpacing: 2.6,
            color: DIM,
            marginBottom: 14,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>BLAST RADIUS PER OPERATION</span>
          <span style={{color: blastNow > 0.6 ? AMBER : CYAN}}>
            {`${Math.round(blastNow * 100)}%`}
          </span>
        </div>
        <div
          style={{
            position: 'relative',
            height: 8,
            background: '#111722',
            border: `1px solid ${LINE}`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 1,
              width: `calc(${blastNow * 100}% - 2px)`,
              background: `linear-gradient(90deg, ${CYAN}, ${AMBER})`,
            }}
          />
          {/* handle */}
          <div
            style={{
              position: 'absolute',
              left: `calc(${blastNow * 100}% - 9px)`,
              top: -9,
              width: 18,
              height: 26,
              borderRadius: 3,
              background: '#e8eef5',
              boxShadow: `0 0 16px ${CYAN}aa`,
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 14,
            fontFamily: MONO,
            fontSize: 13,
            color: DIM,
          }}
        >
          <span>&#8592; lighter, cheaper, less capable</span>
          <span>heavier, slower, full kernel &#8594;</span>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 620,
          textAlign: 'center',
          opacity: window_(frame, 198, 344, 16),
          fontFamily: SANS,
          fontSize: 24,
          color: FG,
        }}
      >
        Pick the <span style={{color: CYAN}}>cheapest tier</span> that satisfies the
        blast radius &#8212; <span style={{color: AMBER}}>per operation.</span>
      </div>
    </AbsoluteFill>
  );
};
