import { useCurrentFrame, interpolate } from "remotion";
import type { CSSProperties, ReactNode } from "react";

interface FadeSlideProps {
  children: ReactNode;
  delay?: number;
  durationFrames?: number;
  offsetY?: number;
  style?: CSSProperties;
}

export const FadeSlide = ({
  children,
  delay = 0,
  durationFrames = 20,
  offsetY = 20,
  style,
}: FadeSlideProps) => {
  const frame = useCurrentFrame();
  const progress = frame - delay;

  const opacity = interpolate(progress, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(progress, [0, durationFrames], [offsetY, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ opacity, transform: `translateY(${translateY}px)`, ...style }}>
      {children}
    </div>
  );
};
