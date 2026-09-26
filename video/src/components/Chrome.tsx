import React from 'react';
import {useCurrentFrame} from 'remotion';
import {MONO, DIM, LINE, CYAN} from '../theme';
import {reveal} from './anim';

/** Small monospace scene label, top-left, with a rule that wipes in under it. */
export const SceneLabel: React.FC<{
  index: string;
  text: string;
  color?: string;
}> = ({index, text, color = CYAN}) => {
  const frame = useCurrentFrame();
  const p = reveal(frame, 2, 14);
  return (
    <div
      style={{
        position: 'absolute',
        top: 38,
        left: 62,
        right: 62,
        opacity: p,
        transform: `translateY(${(1 - p) * -10}px)`,
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 14,
          letterSpacing: 2.4,
          color: DIM,
          display: 'flex',
          gap: 14,
          alignItems: 'baseline',
        }}
      >
        <span style={{color}}>{index}</span>
        <span style={{color: '#aab6c4'}}>{text.toUpperCase()}</span>
      </div>
      <div
        style={{
          marginTop: 10,
          height: 1,
          background: `linear-gradient(90deg, ${color}aa, ${LINE} 55%, transparent)`,
          transformOrigin: 'left',
          transform: `scaleX(${p})`,
        }}
      />
    </div>
  );
};

/** Thin global progress bar pinned to the bottom of every frame. */
export const ProgressBar: React.FC<{progress: number}> = ({progress}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 3,
      background: 'rgba(255,255,255,0.06)',
    }}
  >
    <div
      style={{
        height: '100%',
        width: `${Math.min(1, Math.max(0, progress)) * 100}%`,
        background: `linear-gradient(90deg, ${CYAN}, #67e8f9)`,
        boxShadow: `0 0 10px ${CYAN}aa`,
      }}
    />
  </div>
);
