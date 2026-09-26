import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Background} from '../components/Background';
import {MONO, SANS, FG, DIM, CYAN, AMBER} from '../theme';
import {reveal, pop} from '../components/anim';

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const s = pop(frame, 6);
  const rule = reveal(frame, 26, 26);

  return (
    <AbsoluteFill>
      <Background tint="#0d3040" />
      <AbsoluteFill
        style={{justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 14,
            letterSpacing: 3.4,
            color: '#8b98a9',
            opacity: reveal(frame, 2, 18),
          }}
        >
          AGENT RUNTIMES
        </div>

        <div
          style={{
            fontFamily: MONO,
            fontSize: 38,
            color: FG,
            marginTop: 26,
            opacity: Math.min(1, s * 1.3),
            transform: `translateY(${(1 - s) * 22}px)`,
          }}
        >
          github.com/
          <span style={{color: CYAN}}>manikanda-kumar</span>/agent-runtime
        </div>

        <div
          style={{
            width: 640,
            height: 2,
            marginTop: 30,
            background: `linear-gradient(90deg, ${CYAN}, ${AMBER})`,
            transformOrigin: 'center',
            transform: `scaleX(${rule})`,
            boxShadow: `0 0 14px ${CYAN}66`,
          }}
        />

        <div
          style={{
            fontFamily: SANS,
            fontSize: 21,
            color: '#9fabba',
            marginTop: 30,
            opacity: reveal(frame, 48, 22),
          }}
        >
          five eras &#183; three waves &#183; one moat
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
