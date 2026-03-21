import { useCurrentFrame, interpolate } from "remotion";
import { ExtensionFrame } from "../components/ExtensionFrame";
import { theme } from "../styles/theme";

const results = [
  { label: "applied", count: 12, color: "success" as const, icon: "✓" },
  { label: "skipped", count: 2, color: "warning" as const, icon: "⚠" },
  { label: "failed", count: 1, color: "danger" as const, icon: "✕" },
];

export const SummaryScene = () => {
  const frame = useCurrentFrame();
  const t = theme.colors;
  const s = 2;

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
      <ExtensionFrame activeTab="autoApply">
        <div style={{ fontSize: 12 * s, fontWeight: 600, color: t.textPrimary, marginBottom: 12 * s }}>
          Results
        </div>

        {/* Result badges */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 * s }}>
          {results.map((r, i) => {
            const delay = i * 12;
            const opacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const badgeColor = t[r.color];
            const badgeBg = t[`${r.color}Muted` as keyof typeof t];

            return (
              <div key={r.label} style={{
                opacity,
                display: "flex",
                alignItems: "center",
                gap: 4 * s,
                padding: `${3 * s}px ${10 * s}px`,
                borderRadius: 99,
                background: badgeBg,
                color: badgeColor,
                fontSize: 10 * s,
                fontWeight: 600,
              }}>
                {r.icon} {r.count} {r.label}
              </div>
            );
          })}
        </div>

        {/* Completed progress bar */}
        <div style={{
          height: 6 * s,
          borderRadius: 3 * s,
          background: t.accent,
          marginTop: 16 * s,
        }} />
      </ExtensionFrame>
    </div>
  );
};
