import { useCurrentFrame } from "remotion";
import { ensureFonts } from "./fonts";
import { theme } from "./styles/theme";

export const DemoVideo = () => {
  ensureFonts();
  const frame = useCurrentFrame();
  return (
    <div style={{
      flex: 1,
      background: theme.colors.base,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <span style={{
        color: theme.colors.textPrimary,
        fontFamily: theme.fonts.sans,
        fontSize: 48,
        fontWeight: 700,
      }}>
        Frame {frame}
      </span>
    </div>
  );
};
