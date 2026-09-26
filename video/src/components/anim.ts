import {interpolate, Easing, spring} from 'remotion';

/** 0 -> 1 ease-out reveal starting at `delay`, lasting `dur` frames. */
export const reveal = (frame: number, delay: number, dur = 18) =>
  interpolate(frame - delay, [0, dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

/** Overshooting spring, for slide/scale entrances. */
export const pop = (frame: number, delay: number, damping = 13) =>
  spring({
    frame: frame - delay,
    fps: 30,
    config: {damping, mass: 0.7, stiffness: 110},
    durationInFrames: 30,
  });

/** Fade in at `inAt`, out at `outAt`. */
export const window_ = (frame: number, inAt: number, outAt: number, dur = 15) =>
  Math.min(reveal(frame, inAt, dur), 1 - reveal(frame, outAt, dur));

export const blink = (frame: number, period = 24) =>
  frame % period < period / 2 ? 1 : 0;

/** Ease-in-out ramp between two values. */
export const ramp = (
  frame: number,
  delay: number,
  dur: number,
  from: number,
  to: number
) =>
  interpolate(frame - delay, [0, dur], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
