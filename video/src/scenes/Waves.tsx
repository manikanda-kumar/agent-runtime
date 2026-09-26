import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Background} from '../components/Background';
import {SceneLabel} from '../components/Chrome';
import {MONO, SANS, FG, DIM, LINE, CYAN, AMBER} from '../theme';
import {reveal, pop, window_} from '../components/anim';

type Wave = {
  tag: string;
  title: string;
  sub: string;
  chips: string[];
  color: string;
  badge?: string;
  arrows?: boolean;
};

const WAVES: Wave[] = [
  {
    tag: 'WAVE 1',
    title: 'SANDBOXES',
    sub: 'same Firecracker physics, same create / exec / pause / resume / snapshot API',
    chips: ['E2B', 'Modal', 'Vercel Hive', 'AWS Lambda MicroVMs'],
    color: CYAN,
  },
  {
    tag: 'WAVE 2',
    title: 'RECORDS',
    sub: '"identity and session state must survive the compute dying"',
    chips: ['Durable Objects', 'Rivet actors', 'Temporal'],
    color: CYAN,
  },
  {
    tag: 'WAVE 3',
    title: 'CODE MODE',
    sub: 'MCP → agents write code against typed tools',
    chips: ['MCP', 'typed API', 'run in an isolate', 'return results only'],
    color: AMBER,
    badge: '98% fewer tokens',
    arrows: true,
  },
];

const TOP = 136;
const ROW_H = 158;

export const Waves: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <Background tint="#0d3040" />
      <SceneLabel index="02" text="three waves of the agent era" />

      {WAVES.map((w, i) => {
        const at = 14 + i * 132;
        const s = pop(frame, at);
        const p = reveal(frame, at, 20);
        return (
          <div
            key={w.tag}
            style={{
              position: 'absolute',
              left: 88,
              top: TOP + i * ROW_H,
              width: 1104,
              height: 140,
              display: 'flex',
              gap: 24,
              border: `1px solid ${LINE}`,
              borderLeft: `3px solid ${w.color}`,
              background: 'rgba(12,17,25,0.72)',
              padding: '18px 24px',
              boxSizing: 'border-box',
              opacity: Math.min(1, p * 1.2),
              transform: `translateX(${(1 - s) * -56}px)`,
            }}
          >
            <div style={{flex: 1}}>
              <div style={{display: 'flex', alignItems: 'baseline', gap: 18}}>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 12.5,
                    letterSpacing: 2.8,
                    color: w.color,
                  }}
                >
                  {w.tag}
                </span>
                <span
                  style={{
                    fontFamily: SANS,
                    fontWeight: 700,
                    fontSize: 30,
                    letterSpacing: 1,
                    color: FG,
                  }}
                >
                  {w.title}
                </span>
                {w.badge ? (
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 13,
                      color: AMBER,
                      border: `1px solid ${AMBER}77`,
                      background: `${AMBER}18`,
                      padding: '4px 10px',
                      opacity: reveal(frame, at + 40, 18),
                    }}
                  >
                    {w.badge}
                  </span>
                ) : null}
              </div>

              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 14,
                  color: DIM,
                  marginTop: 10,
                  opacity: reveal(frame, at + 10, 16),
                }}
              >
                {w.sub}
              </div>

              <div
                style={{display: 'flex', gap: 9, marginTop: 14, alignItems: 'center'}}
              >
                {w.chips.map((c, j) => {
                  const cp = reveal(frame, at + 18 + j * 9, 15);
                  return (
                    <React.Fragment key={c}>
                      {w.arrows && j > 0 ? (
                        <span
                          style={{
                            fontFamily: MONO,
                            fontSize: 14,
                            color: w.color,
                            opacity: cp,
                          }}
                        >
                          &#8594;
                        </span>
                      ) : null}
                      <div
                        style={{
                          fontFamily: MONO,
                          fontSize: 13.5,
                          color: '#b6c2d0',
                          border: `1px solid ${LINE}`,
                          borderLeft: `2px solid ${w.color}`,
                          background: '#0c111a',
                          padding: '7px 12px',
                          opacity: cp,
                          transform: `translateY(${(1 - cp) * 9}px)`,
                        }}
                      >
                        {c}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 632,
          textAlign: 'center',
          opacity: window_(frame, 440, 578, 18),
          fontFamily: SANS,
          fontSize: 24,
          color: FG,
        }}
      >
        Sandboxes commoditized.{' '}
        <span style={{color: AMBER}}>The record did not.</span>
      </div>
    </AbsoluteFill>
  );
};
