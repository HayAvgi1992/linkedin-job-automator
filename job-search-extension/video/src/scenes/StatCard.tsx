import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { theme } from "../styles/theme";
import { AnimatedNumber } from "../components/AnimatedNumber";

interface StatCardProps {
  headline: string;
  subtitle: string;
  accentWord?: string;
  animatedNumber?: { to: number; prefix?: string; suffix?: string };
  items?: string[];
}

export const StatCard = ({ headline, subtitle, accentWord, animatedNumber, items }: StatCardProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = theme.colors;

  const headlineOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const headlineY = interpolate(frame, [0, 15], [20, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  const subtitleOpacity = interpolate(frame, [12, 27], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const subtitleY = interpolate(frame, [12, 27], [15, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Render headline with optional accent word highlighting
  const renderHeadline = () => {
    if (animatedNumber) {
      return (
        <AnimatedNumber
          to={animatedNumber.to}
          prefix={animatedNumber.prefix}
          suffix={animatedNumber.suffix}
          startFrame={5}
          style={{
            fontSize: 72,
            fontWeight: 800,
            fontFamily: theme.fonts.mono,
            color: t.accent,
          }}
        />
      );
    }

    if (!accentWord) {
      return <span>{headline}</span>;
    }

    const parts = headline.split(accentWord);
    return (
      <>
        {parts[0]}
        <span style={{ color: t.accent }}>{accentWord}</span>
        {parts[1] || ""}
      </>
    );
  };

  return (
    <div style={{
      width: "100%",
      height: "100%",
      background: t.base,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 80,
      fontFamily: theme.fonts.sans,
    }}>
      {/* Headline */}
      <div style={{
        opacity: headlineOpacity,
        transform: `translateY(${headlineY}px)`,
        fontSize: animatedNumber ? 72 : 36,
        fontWeight: 700,
        color: t.textPrimary,
        textAlign: "center",
        lineHeight: 1.2,
        maxWidth: 800,
        marginBottom: 20,
      }}>
        {renderHeadline()}
      </div>

      {/* Subtitle */}
      <div style={{
        opacity: subtitleOpacity,
        transform: `translateY(${subtitleY}px)`,
        fontSize: 20,
        color: t.textSecondary,
        textAlign: "center",
        maxWidth: 600,
      }}>
        {subtitle}
      </div>

      {/* Stacked items */}
      {items && (
        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map((item, i) => {
            const itemDelay = 25 + i * 12;
            const itemOpacity = interpolate(frame, [itemDelay, itemDelay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const itemY = interpolate(frame, [itemDelay, itemDelay + 12], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

            return (
              <div key={i} style={{
                opacity: itemOpacity,
                transform: `translateY(${itemY}px)`,
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 18,
                color: t.textSecondary,
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: t.accent,
                  flexShrink: 0,
                }} />
                {item}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
