import React from 'react';
import {Composition} from 'remotion';
import {AgentRuntimes, TOTAL} from './Video';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="AgentRuntimes"
    component={AgentRuntimes}
    durationInFrames={TOTAL}
    fps={30}
    width={1280}
    height={720}
  />
);
