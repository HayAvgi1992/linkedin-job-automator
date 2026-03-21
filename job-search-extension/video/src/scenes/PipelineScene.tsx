import { useCurrentFrame, interpolate } from "remotion";
import { ExtensionFrame } from "../components/ExtensionFrame";
import { MockPipeline } from "../components/MockPipeline";
import { theme } from "../styles/theme";

export const PipelineScene = () => {
  const frame = useCurrentFrame();
  const t = theme.colors;

  // Stage transitions: stage 0 active at start, stage 1 at 60 frames (2s), stage 2 at 150 frames (5s), all done at 210 (7s)
  const activeStage = frame < 60 ? 0 : frame < 150 ? 1 : frame < 210 ? 2 : 3;

  // Detail text for active stage
  const detailText = activeStage === 0
    ? `${Math.min(Math.floor(interpolate(frame, [0, 55], [0, 100], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })), 100)}%`
    : activeStage === 1
    ? (() => {
        const count = Math.min(Math.floor(interpolate(frame, [60, 145], [1, 47], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })), 47);
        return `(${count}/47)`;
      })()
    : undefined;

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
      <ExtensionFrame activeTab="search">
        <MockPipeline activeStage={activeStage} detailText={detailText} />
      </ExtensionFrame>
    </div>
  );
};
