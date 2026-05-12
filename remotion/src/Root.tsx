import React from "react";
import { Composition } from "remotion";
import { IndianSuccessStory, calculateDuration } from "./compositions/Video";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="IndianSuccessStory"
        component={IndianSuccessStory}
        durationInFrames={calculateDuration([])}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          storyId: "preview",
          title:   "Preview Story",
          scenes:  Array.from({ length: 3 }, (_, i) => ({
            narration: `Scene ${i + 1} narration placeholder text.`,
            imageUrl:  "https://via.placeholder.com/1920x1080",
            audioUrl:  "",
            duration:  6,
          })),
        }}
        calculateMetadata={({ props }) => ({
          durationInFrames: calculateDuration(props.scenes),
          fps: 30,
          width: 1920,
          height: 1080,
        })}
      />
    </>
  );
};
