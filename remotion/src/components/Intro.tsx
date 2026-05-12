import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from "remotion";

export const Intro: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const titleY    = interpolate(frame, [10, 25], [40, 0], { extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1E3A5F 0%, #C65D3A 100%)",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      {/* Channel logo placeholder */}
      <div
        style={{
          width:        160,
          height:       160,
          borderRadius: "50%",
          background:   "#F5E6D3",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
          transform:    `scale(${logoScale})`,
          boxShadow:    "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <span style={{ fontSize: 80 }}>🇮🇳</span>
      </div>

      <div
        style={{
          transform: `translateY(${titleY}px)`,
          opacity:    titleOpacity,
          textAlign:  "center",
        }}
      >
        <p
          style={{
            fontFamily: "Poppins, sans-serif",
            fontWeight: 800,
            fontSize:   56,
            color:      "#F5E6D3",
            margin:     0,
            letterSpacing: 2,
          }}
        >
          Indian Success Stories
        </p>
        <p
          style={{
            fontFamily: "Hind, sans-serif",
            fontWeight: 400,
            fontSize:   28,
            color:      "#F5E6D3AA",
            margin:     "8px 0 0 0",
          }}
        >
          {title}
        </p>
      </div>

      <Audio src={staticFile("music/intro.mp3")} />
    </AbsoluteFill>
  );
};
