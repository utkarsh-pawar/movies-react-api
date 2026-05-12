import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface SceneProps {
  narration: string;
  imageUrl:  string;
  audioUrl:  string;
  duration:  number;
}

// Ken Burns: alternate between zoom-in-pan-right and zoom-out-pan-left
let sceneIndex = 0;

export const Scene: React.FC<SceneProps> = ({ narration, imageUrl, audioUrl, duration }) => {
  const frame  = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  // Alternate Ken Burns directions
  const zoomStart = sceneIndex % 2 === 0 ? 1.0 : 1.08;
  const zoomEnd   = sceneIndex % 2 === 0 ? 1.08 : 1.0;
  const panX      = sceneIndex % 2 === 0 ? interpolate(progress, [0, 1], [0, -2]) : interpolate(progress, [0, 1], [-2, 0]);

  const scale = interpolate(progress, [0, 1], [zoomStart, zoomEnd]);

  // Caption fade: in at 0.2s, out at duration-0.5s
  const captionOpacity = interpolate(
    frame,
    [Math.round(fps * 0.2), Math.round(fps * 0.5), durationInFrames - Math.round(fps * 0.5), durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill>
      {/* Background image with Ken Burns */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={imageUrl}
          style={{
            width:  "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale}) translateX(${panX}%)`,
            transformOrigin: "center center",
          }}
        />
      </AbsoluteFill>

      {/* Bottom-third caption */}
      <AbsoluteFill
        style={{
          display:        "flex",
          alignItems:     "flex-end",
          justifyContent: "center",
          paddingBottom:  80,
          opacity: captionOpacity,
        }}
      >
        <div
          style={{
            background:   "rgba(0,0,0,0.55)",
            borderRadius: 12,
            padding:      "18px 36px",
            maxWidth:     "80%",
            textAlign:    "center",
          }}
        >
          <span
            style={{
              fontFamily: "Poppins, sans-serif",
              fontWeight: 700,
              fontSize:   48,
              color:      "#FFFFFF",
              textShadow: "2px 2px 8px rgba(0,0,0,0.8)",
              lineHeight: 1.3,
            }}
          >
            {narration}
          </span>
        </div>
      </AbsoluteFill>

      {/* Scene narration audio */}
      {audioUrl && <Audio src={audioUrl} />}
    </AbsoluteFill>
  );
};
