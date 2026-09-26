import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Background} from '../components/Background';
import {SceneLabel} from '../components/Chrome';
import {MONO, SANS, FG, DIM, LINE, CYAN, AMBER} from '../theme';
import {reveal, pop, blink} from '../components/anim';

const BUY = ['isolation & snapshots', 'pause / resume, $0 idle', 'bursty capacity'];
const BUILD = ['the durable session record', 'approvals + channel adapters', 'a journal of every tool call'];

const Line: React.FC<{
  text: string;
  at: number;
  color: string;
  frame: number;
  cursor?: boolean;
}> = ({text, at, color, frame, cursor}) => {
  const s = pop(frame, at, 15);
  return (
    <div
      style={{
        fontFamily: SANS,
        fontWeight: 700,
        fontSize: 54,
        letterSpacing: 0.5,
        lineHeight: 1.2,
        color,
        opacity: Math.min(1, s * 1.4),
        transform: `translateY(${(1 - s) * 34}px)`,
      }}
    >
      {text}
      {cursor ? (
        <span
          style={{
            fontFamily: MONO,
            color: CYAN,
            marginLeft: 12,
            opacity: frame > at + 26 ? blink(frame) : 0,
          }}
        >
          &#9611;
        </span>
      ) : null}
    </div>
  );
};

const Col: React.FC<{
  tag: string;
  items: string[];
  color: string;
  at: number;
  frame: number;
}> = ({tag, items, color, at, frame}) => {
  const p = reveal(frame, at, 20);
  return (
    <div
      style={{
        flex: 1,
        borderTop: `2px solid ${color}`,
        paddingTop: 14,
        opacity: p,
        transform: `translateY(${(1 - p) * 16}px)`,
      }}
    >
      <div
        style={{fontFamily: MONO, fontSize: 12.5, letterSpacing: 3, color}}
      >
        {tag}
      </div>
      {items.map((it, j) => {
        const ip = reveal(frame, at + 12 + j * 9, 14);
        return (
          <div
            key={it}
            style={{
              fontFamily: MONO,
              fontSize: 14,
              color: '#b6c2d0',
              marginTop: 10,
              opacity: ip,
              transform: `translateX(${(1 - ip) * 12}px)`,
            }}
          >
            <span style={{color, marginRight: 10}}>&#9656;</span>
            {it}
          </div>
        );
      })}
    </div>
  );
};

export const Takeaway: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <Background tint="#0d3040" />
      <SceneLabel index="04" text="the takeaway" color={AMBER} />

      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 170,
          width: 1060,
        }}
      >
        <Line text="Buy the sandbox substrate." at={10} color={FG} frame={frame} />
        {/* a beat of silence, then the second line lands */}
        <div style={{height: 26}} />
        <Line
          text="BUILD THE CONTROL PLANE."
          at={104}
          color={AMBER}
          frame={frame}
          cursor
        />

        <div
          style={{
            height: 1,
            background: `linear-gradient(90deg, ${LINE}, transparent)`,
            margin: '44px 0 0',
            transformOrigin: 'left',
            transform: `scaleX(${reveal(frame, 132, 22)})`,
          }}
        />

        <div style={{display: 'flex', gap: 60, marginTop: 30}}>
          <Col tag="BUY" items={BUY} color={CYAN} at={142} frame={frame} />
          <Col tag="BUILD" items={BUILD} color={AMBER} at={158} frame={frame} />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 652,
          textAlign: 'center',
          fontFamily: MONO,
          fontSize: 14,
          letterSpacing: 1.6,
          color: DIM,
          opacity: reveal(frame, 214, 22),
        }}
      >
        an agent is an actor with a mailbox and a memory
      </div>
    </AbsoluteFill>
  );
};
