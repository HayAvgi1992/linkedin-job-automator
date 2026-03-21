import { FadeSlide } from "../components/FadeSlide";
import { theme } from "../styles/theme";

export const HookScene = () => {
  const t = theme.colors;

  return (
    <div style={{
      width: "100%",
      height: "100%",
      background: t.base,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 80,
      fontFamily: theme.fonts.sans,
    }}>
      <FadeSlide delay={0} durationFrames={25} offsetY={30}>
        <div style={{
          fontSize: 38,
          fontWeight: 700,
          color: t.textPrimary,
          textAlign: "center",
          lineHeight: 1.3,
          maxWidth: 800,
        }}>
          I built a Chrome extension that{" "}
          <span style={{ color: t.accent }}>ranks</span> and auto-applies to{" "}
          <span style={{ color: t.accent }}>100</span> LinkedIn jobs.
        </div>
      </FadeSlide>
    </div>
  );
};
