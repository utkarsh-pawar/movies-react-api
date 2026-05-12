import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from "remotion";

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const opacity = interpolate(frame, [0, 10, durationInFrames - 10, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft:  "clamp",
    extrapolateRight: "clamp",
  });

  const scaleIn = interpolate(frame, [0, 15], [0.85, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background:     "linear-gradient(135deg, #C65D3A 0%, #1E3A5F 100%)",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        gap: 32,
        opacity,
      }}
    >
      <div style={{ transform: `scale(${scaleIn})`, textAlign: "center" }}>
        <p
          style={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 800,
            fontSize:   64,
            color:      "#F5E6D3",
            margin:     0,
          }}
        >
          Subscribe for More!
        </p>
        <p
          style={{
            fontFamily: "Hind, sans-serif",
            fontWeight: 400,
            fontSize:   32,
            color:      "#F5E6D3CC",
            margin:     "16px 0 0 0",
          }}
        >
          🔔 New story every week
        </p>
      </div>

      {/* Subscribe button visual */}
      <div
        style={{
          background:   "#FF0000",
          borderRadius: 12,
          padding:      "20px 56px",
          transform:    `scale(${scaleIn})`,
        }}
      >
        <span
          style={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 700,
            fontSize:   36,
            color:      "#FFFFFF",
          }}
        >
          SUBSCRIBE
        </span>
      </div>

      <Audio src={staticFile("music/outro.mp3")} />
    </AbsoluteFill>
  );
};
