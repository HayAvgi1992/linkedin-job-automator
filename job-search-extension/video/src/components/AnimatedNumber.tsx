import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import type { CSSProperties } from "react";

interface AnimatedNumberProps {
  from?: number;
  to: number;
  startFrame?: number;
  style?: CSSProperties;
  prefix?: string;
  suffix?: string;
}

export const AnimatedNumber = ({
  from = 0,
  to,
  startFrame = 0,
  style,
  prefix = "",
  suffix = "",
}: AnimatedNumberProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: Math.max(frame - startFrame, 0),
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 80, damping: 20 },
  });

  const value = Math.round(from + (to - from) * progress);

  return <span style={style}>{prefix}{value}{suffix}</span>;
};
