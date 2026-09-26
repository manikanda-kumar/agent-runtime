import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {BG, LINE} from '../theme';

/** Procedural drifting grid + scanlines + vignette. No assets, no fetches. */
export const Background: React.FC<{tint?: string}> = ({tint = '#0d3a48'}) => {
  const frame = useCurrentFrame();
  const drift = (frame * 0.16) % 44;

  return (
    <AbsoluteFill style={{backgroundColor: BG}}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${LINE} 1px, transparent 1px), linear-gradient(90deg, ${LINE} 1px, transparent 1px)`,
          backgroundSize: '44px 44px',
          backgroundPosition: `${-drift}px ${-drift}px`,
          opacity: 0.5,
        }}
      />
      {/* scanlines */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 3px)',
          opacity: 0.6,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(68% 58% at 50% 40%, ${tint}4d 0%, transparent 72%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(115% 95% at 50% 50%, transparent 42%, rgba(0,0,0,0.8) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
