import { useCurrentFrame } from "remotion";
import type { CSSProperties } from "react";

interface TypeWriterProps {
  text: string;
  startFrame?: number;
  charsPerSecond?: number;
  style?: CSSProperties;
  cursorColor?: string;
}

export const TypeWriter = ({
  text,
  startFrame = 0,
  charsPerSecond = 15,
  style,
  cursorColor = "#10b981",
}: TypeWriterProps) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(frame - startFrame, 0);
  const charsPerFrame = charsPerSecond / 30;
  const visibleChars = Math.min(Math.floor(elapsed * charsPerFrame), text.length);
  const done = visibleChars >= text.length;
  const showCursor = !done || Math.floor(elapsed / 15) % 2 === 0;

  return (
    <span style={style}>
      {text.slice(0, visibleChars)}
      {showCursor && (
        <span style={{ color: cursorColor, fontWeight: 400 }}>|</span>
      )}
    </span>
  );
};
