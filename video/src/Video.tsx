import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, interpolate} from 'remotion';
import {Title} from './scenes/Title';
import {Eras} from './scenes/Eras';
import {Waves} from './scenes/Waves';
import {Gradient} from './scenes/Gradient';
import {Takeaway} from './scenes/Takeaway';
import {EndCard} from './scenes/EndCard';
import {ProgressBar} from './components/Chrome';
import {BG} from './theme';

export const SCENES = [
  {C: Title, dur: 120},     // 0:00 - 0:04
  {C: Eras, dur: 780},      // 0:04 - 0:30
  {C: Waves, dur: 600},     // 0:30 - 0:50
  {C: Gradient, dur: 360},  // 0:50 - 1:02
  {C: Takeaway, dur: 300},  // 1:02 - 1:12
  {C: EndCard, dur: 150},   // 1:12 - 1:17
] as const;

export const TOTAL = SCENES.reduce((a, s) => a + s.dur, 0);

/** Sample-frame targets: one mid-scene frame per scene. */
export const SAMPLE_FRAMES = (() => {
  let from = 0;
  return SCENES.map(({dur}) => {
    const mid = from + Math.floor(dur * 0.55);
    from += dur;
    return mid;
  });
})();

/** Short cross-fade at each boundary so the quick cuts don't snap. */
const Fade: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
  const frame = useCurrentFrame();
  const o = Math.min(
    interpolate(frame, [0, 8], [0, 1], {extrapolateRight: 'clamp'}),
    interpolate(frame, [dur - 8, dur], [1, 0], {extrapolateLeft: 'clamp'})
  );
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const AgentRuntimes: React.FC = () => {
  const frame = useCurrentFrame();
  let from = 0;
  return (
    <AbsoluteFill style={{backgroundColor: BG}}>
      {SCENES.map(({C, dur}, i) => {
        const start = from;
        from += dur;
        return (
          <Sequence key={i} from={start} durationInFrames={dur}>
            <Fade dur={dur}>
              <C />
            </Fade>
          </Sequence>
        );
      })}
      <ProgressBar progress={frame / (TOTAL - 1)} />
    </AbsoluteFill>
  );
};
