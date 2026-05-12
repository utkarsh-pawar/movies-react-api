import React from "react";
import { AbsoluteFill, Audio, Series, staticFile } from "remotion";
import { Intro } from "../components/Intro";
import { Outro } from "../components/Outro";
import { Scene, type SceneProps } from "../components/Scene";

export interface VideoProps {
  storyId: string;
  title:   string;
  scenes:  SceneProps[];
}

const FPS        = 30;
const INTRO_SECS = 5;
const OUTRO_SECS = 5;

export function calculateDuration(scenes: SceneProps[]): number {
  const sceneSecs = scenes.reduce((acc, s) => acc + (s.duration ?? 6), 0);
  return (INTRO_SECS + sceneSecs + OUTRO_SECS) * FPS;
}

export const IndianSuccessStory: React.FC<VideoProps> = ({ title, scenes }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#1E3A5F" }}>
      {/* Background music bed at -20dB — looped */}
      <Audio
        src={staticFile("music/background-bed.mp3")}
        volume={(f) => {
          // Duck to 0.05 during narration, 0.3 in intro/outro
          const introDone = INTRO_SECS * FPS;
          const outrStart = calculateDuration(scenes) - OUTRO_SECS * FPS;
          if (f < introDone || f > outrStart) return 0.3;
          return 0.05;
        }}
        loop
      />

      <Series>
        {/* 5s branded intro */}
        <Series.Sequence durationInFrames={INTRO_SECS * FPS}>
          <Intro title={title} />
        </Series.Sequence>

        {/* Story scenes */}
        {scenes.map((scene, i) => (
          <Series.Sequence key={i} durationInFrames={Math.round(scene.duration * FPS)}>
            <Scene {...scene} />
          </Series.Sequence>
        ))}

        {/* 5s branded outro */}
        <Series.Sequence durationInFrames={OUTRO_SECS * FPS}>
          <Outro />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
