import { useCurrentFrame, interpolate } from "remotion";
import { MockJobCard } from "../components/MockJobCard";
import { mockJobs } from "../data/mockJobs";
import { theme } from "../styles/theme";

export const ScoreScene = () => {
  const frame = useCurrentFrame();
  const t = theme.colors;

  // Get highest-scoring job
  const topJob = [...mockJobs].sort((a, b) => (b.matchScore?.overall || 0) - (a.matchScore?.overall || 0))[0];

  // Zoom in over first 20 frames
  const zoomScale = interpolate(frame, [0, 20], [1, 1.3], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Expand breakdown after 30 frames
  const scoreOpen = frame > 30;

  // Animate score bars from 0 to full over 40 frames after breakdown opens
  const barProgress = interpolate(frame, [30, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{
      width: "100%",
      height: "100%",
      background: t.base,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: theme.fonts.sans,
    }}>
      <div style={{
        transform: `scale(${zoomScale})`,
        width: 760, // 380 * 2
      }}>
        <MockJobCard job={topJob} scoreOpen={scoreOpen} barProgress={barProgress} />
      </div>
    </div>
  );
};
