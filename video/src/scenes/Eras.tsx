import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {Background} from '../components/Background';
import {SceneLabel} from '../components/Chrome';
import {MONO, SANS, FG, FG2, DIM, LINE, CYAN, AMBER} from '../theme';
import {reveal, pop, window_} from '../components/anim';
import {GLYPHS} from '../components/Glyphs';

export const ERA_LEN = 156;

type Era = {
  n: string;
  short: string;
  unit: string;
  density: string;
  who: string;
  year: string;
  line: string;
  chips: string[];
};

const ERAS: Era[] = [
  {
    n: 'THE MACHINE',
    short: 'MACHINE',
    unit: 'the VM',
    density: '~10 per host',
    who: 'VMware ESX',
    year: '1998',
    line: 'Hardware virtualized. Isolation at any cost.',
    chips: ['ESX 2001', 'vMotion 2003', 'cold start: minutes'],
  },
  {
    n: 'THE PROCESS',
    short: 'PROCESS',
    unit: 'the container',
    density: '~100 per host',
    who: 'Docker + Kubernetes',
    year: '2013',
    line: 'The image wins. State exiled to databases.',
    chips: ['OCI image', 'K8s 2014', 'cold start: ~1s'],
  },
  {
    n: 'THE EVENT',
    short: 'EVENT',
    unit: 'the function',
    density: '~1k per host',
    who: 'AWS Lambda \u00b7 Firecracker',
    year: '2014',
    line: 'VM isolation at container speed: <125ms boot.',
    chips: ['scale to zero', 'Firecracker 2018', '150 microVMs/sec'],
  },
  {
    n: 'THE ISOLATE',
    short: 'ISOLATE',
    unit: 'the V8 isolate',
    density: '~100k per host',
    who: 'Cloudflare Workers / WASM',
    year: '2017',
    line: '0ms cold starts — inside a restricted runtime.',
    chips: ['V8 isolate', 'WASI 2019', 'no arbitrary binaries'],
  },
  {
    n: 'THE RECORD',
    short: 'RECORD',
    unit: 'the durable object',
    density: 'millions',
    who: 'Durable Objects / actors / Temporal',
    year: '2020',
    line: 'Identity + state + mailbox reunite.',
    chips: ['colocated SQLite', 'hibernation', '~20ms wake'],
  },
];

const AXIS_Y = 566;
const NODE_X = (i: number) => 164 + i * 238;

export const Eras: React.FC = () => {
  const frame = useCurrentFrame();
  const axis = reveal(frame, 6, 40);
  // Cards begin their entrance 12f early, so the timeline leads by the same
  // amount and the node lights with the card that is arriving.
  const lead = frame + 12;
  const active = Math.min(ERAS.length - 1, Math.floor(lead / ERA_LEN));
  // The filled line travels from the active node toward the next one, so it
  // arrives exactly as that era takes over.
  const segT = Math.max(0, Math.min(1, (lead % ERA_LEN) / ERA_LEN));
  const lineW =
    interpolate(
      segT,
      [0, 1],
      [NODE_X(active), NODE_X(Math.min(ERAS.length - 1, active + 1))]
    ) - 110;

  return (
    <AbsoluteFill>
      <Background tint="#0d3040" />
      <SceneLabel index="01" text="the thirty-year arc" />

      {ERAS.map((e, i) => {
        const at = i * ERA_LEN;
        const f = frame - at;
        // Card fades/slides in, holds, then slides out under the next card.
        // The outgoing card overlaps the incoming one, so the stage is never blank.
        const inAt = at - 12;
        const outAt = at + ERA_LEN - 14;
        const o = window_(frame, inAt, outAt, 14);
        if (o <= 0.001) return null;
        const inP = reveal(frame, inAt, 20);
        const outP = reveal(frame, outAt, 14);
        const dx = (1 - inP) * 70 - outP * 70;
        const color = i === 4 ? AMBER : CYAN;
        const Glyph = GLYPHS[i];

        return (
          <div key={e.n} style={{opacity: o, transform: `translateX(${dx}px)`}}>
            {/* big ghosted era number behind the glyph */}
            <div
              style={{
                position: 'absolute',
                left: 108,
                top: 204,
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: 150,
                lineHeight: 1,
                color: '#ffffff',
                opacity: 0.045,
              }}
            >
              {`0${i + 1}`}
            </div>

            <div style={{position: 'absolute', left: 146, top: 286}}>
              <Glyph color={color} p={reveal(frame, inAt + 6, 34)} size={118} />
            </div>

            <div style={{position: 'absolute', left: 318, top: 206, width: 860}}>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 13.5,
                  letterSpacing: 2.6,
                  color: color,
                  opacity: reveal(frame, inAt + 4, 14),
                }}
              >
                {`ERA 0${i + 1}`}
                <span style={{color: DIM}}>{`  //  UNIT: ${e.unit.toUpperCase()}  //  ${e.density.toUpperCase()}`}</span>
              </div>

              <div
                style={{
                  fontFamily: SANS,
                  fontWeight: 700,
                  fontSize: 58,
                  lineHeight: 1.05,
                  letterSpacing: 0.5,
                  color: FG,
                  marginTop: 12,
                  transform: `translateY(${(1 - pop(frame, inAt + 6)) * 26}px)`,
                }}
              >
                {e.n}
              </div>

              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 19,
                  color: '#9fabba',
                  marginTop: 10,
                  opacity: reveal(frame, inAt + 14, 16),
                }}
              >
                {e.who} <span style={{color: color}}>&#183; {e.year}</span>
              </div>

              <div
                style={{
                  fontFamily: SANS,
                  fontSize: 27,
                  lineHeight: 1.35,
                  color: FG2,
                  marginTop: 20,
                  opacity: reveal(frame, inAt + 22, 20),
                  transform: `translateY(${(1 - reveal(frame, inAt + 22, 20)) * 14}px)`,
                }}
              >
                {e.line}
              </div>

              {/* late-arriving detail chips keep the beat moving */}
              <div style={{display: 'flex', gap: 10, marginTop: 26}}>
                {e.chips.map((c, j) => {
                  const cp = reveal(frame, inAt + 62 + j * 10, 16);
                  return (
                    <div
                      key={c}
                      style={{
                        fontFamily: MONO,
                        fontSize: 13.5,
                        color: '#b6c2d0',
                        border: `1px solid ${LINE}`,
                        borderLeft: `2px solid ${color}`,
                        background: 'rgba(12,17,25,0.85)',
                        padding: '7px 13px',
                        opacity: cp,
                        transform: `translateY(${(1 - cp) * 10}px)`,
                      }}
                    >
                      {c}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {/* ---- timeline ---- */}
      <div
        style={{
          position: 'absolute',
          left: 110,
          top: AXIS_Y,
          width: 1060,
          height: 1,
          background: LINE,
          opacity: axis,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 110,
          top: AXIS_Y - 1,
          width: 1060,
          height: 2,
          background: `linear-gradient(90deg, ${CYAN}, ${AMBER})`,
          transformOrigin: 'left',
          transform: `scaleX(${lineW / 1060})`,
          boxShadow: `0 0 12px ${CYAN}66`,
        }}
      />

      {ERAS.map((e, i) => {
        const cx = NODE_X(i);
        const isActive = i === active;
        const seen = lead >= i * ERA_LEN;
        const color = i === 4 ? AMBER : CYAN;
        const np = reveal(lead, i * ERA_LEN, 14);
        return (
          <div key={`n${e.n}`}>
            <div
              style={{
                position: 'absolute',
                left: cx - 6,
                top: AXIS_Y - 5,
                width: 12,
                height: 12,
                borderRadius: 12,
                background: seen ? color : LINE,
                transform: `scale(${isActive ? 1.15 + 0.25 * np : 0.8})`,
                boxShadow: isActive ? `0 0 16px ${color}` : 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: cx - 110,
                top: AXIS_Y + 20,
                width: 220,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 16,
                  color: isActive ? FG : DIM,
                  opacity: seen ? 1 : 0.45,
                }}
              >
                {e.year}
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  letterSpacing: 2,
                  marginTop: 5,
                  color: isActive ? color : DIM,
                  opacity: seen ? 1 : 0.4,
                }}
              >
                {e.short}
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
