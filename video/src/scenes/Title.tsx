import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {Background} from '../components/Background';
import {MONO, SANS, FG, DIM, CYAN, AMBER} from '../theme';
import {reveal, pop, blink} from '../components/anim';

const PROMPT = '~/runtime $ ';
const TYPED = 'history --since 1998';
const WORDS = ['AGENT', 'RUNTIMES'];

export const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const chars = Math.min(TYPED.length, Math.max(0, Math.floor((frame - 4) / 1.3)));
  const bars = reveal(frame, 62, 26);

  return (
    <AbsoluteFill>
      <Background tint="#0d3a48" />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
        }}
      >
        <div style={{fontFamily: MONO, fontSize: 18, color: DIM, marginBottom: 26}}>
          <span style={{color: CYAN}}>{PROMPT}</span>
          <span style={{color: FG}}>{TYPED.slice(0, chars)}</span>
          <span style={{color: CYAN, opacity: chars < TYPED.length ? 1 : blink(frame)}}>
            &#9611;
          </span>
        </div>

        {/* kinetic type: each word springs up, slightly overshooting */}
        <div style={{display: 'flex', gap: 22}}>
          {WORDS.map((w, i) => {
            const s = pop(frame, 22 + i * 7);
            return (
              <div
                key={w}
                style={{
                  fontFamily: SANS,
                  fontWeight: 700,
                  fontSize: 82,
                  lineHeight: 1,
                  letterSpacing: 1,
                  color: i === 0 ? FG : CYAN,
                  opacity: Math.min(1, s * 1.4),
                  transform: `translateY(${(1 - s) * 54}px) scale(${0.9 + 0.1 * s})`,
                }}
              >
                {w}
              </div>
            );
          })}
        </div>

        <div style={{display: 'flex', gap: 9, marginTop: 34}}>
          {[0, 1, 2, 3, 4].map((i) => {
            const p = interpolate(bars, [i / 6, (i + 2) / 6], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <div
                key={i}
                style={{
                  width: 86,
                  height: 3,
                  background: i === 4 ? AMBER : CYAN,
                  opacity: 0.2 + 0.8 * p,
                  transformOrigin: 'left',
                  transform: `scaleX(${p})`,
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            fontFamily: SANS,
            fontSize: 20,
            color: '#9fabba',
            marginTop: 28,
            opacity: reveal(frame, 48, 20),
            transform: `translateY(${(1 - reveal(frame, 48, 20)) * 12}px)`,
          }}
        >
          how we got here, and what agents actually need
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
