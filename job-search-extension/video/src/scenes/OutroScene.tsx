import { useCurrentFrame, interpolate } from "remotion";
import { theme } from "../styles/theme";

export const OutroScene = () => {
  const frame = useCurrentFrame();
  const t = theme.colors;

  const line1 = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line2 = interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line3 = interpolate(frame, [40, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const glowIntensity = Math.sin(frame * 0.08) * 0.3 + 0.7;

  return (
    <div style={{
      width: "100%",
      height: "100%",
      background: t.base,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 30,
      fontFamily: theme.fonts.sans,
    }}>
      <div style={{ opacity: line1, fontSize: 28, fontWeight: 600, color: t.textPrimary }}>
        Open source. MIT licensed.
      </div>
      <div style={{
        opacity: line2,
        fontSize: 22,
        fontWeight: 500,
        fontFamily: theme.fonts.mono,
        color: t.accent,
        textShadow: `0 0 ${20 * glowIntensity}px ${t.accentMuted}`,
      }}>
        github.com/4ugusta/linkedin-job-automator
      </div>
      <div style={{ opacity: line3, fontSize: 20, color: t.textSecondary }}>
        Contributors welcome.
      </div>
    </div>
  );
};
