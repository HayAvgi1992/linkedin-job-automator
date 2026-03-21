import { useCurrentFrame } from "remotion";

export const DemoVideo = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ flex: 1, background: "#060908", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "#f0f4f2", fontFamily: "system-ui", fontSize: 48 }}>
        Frame {frame}
      </span>
    </div>
  );
};
