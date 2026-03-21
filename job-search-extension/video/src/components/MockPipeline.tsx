import { theme } from "../styles/theme";

interface MockPipelineProps {
  activeStage: number; // 0=searching, 1=fetching, 2=analyzing, 3=all done
  detailText?: string;
  scale?: number;
}

const stages = [
  { icon: "🔍", label: "Searching LinkedIn" },
  { icon: "📄", label: "Fetching job details" },
  { icon: "🧠", label: "Analyzing match" },
];

export const MockPipeline = ({ activeStage, detailText, scale = 2 }: MockPipelineProps) => {
  const t = theme.colors;

  return (
    <div style={{ display: "flex", flexDirection: "column", padding: `${20 * scale}px 0` }}>
      {stages.map((stage, i) => {
        const state: "done" | "active" | "waiting" =
          i < activeStage ? "done" : i === activeStage ? "active" : "waiting";

        return (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 * scale, padding: `${10 * scale}px 0`, position: "relative" }}>
            {/* Connector line */}
            {i < stages.length - 1 && (
              <div style={{
                position: "absolute",
                left: 13 * scale,
                top: 36 * scale,
                bottom: -4 * scale,
                width: scale,
                background: state === "done" ? t.accent : t.border,
              }} />
            )}

            {/* Dot */}
            <div style={{
              width: 26 * scale,
              height: 26 * scale,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 12 * scale,
              border: `${1.5 * scale}px solid ${state === "done" || state === "active" ? t.accent : t.border}`,
              background: state === "done" ? t.accent : state === "active" ? t.accentMuted : t.surface,
              color: state === "done" ? "#fff" : state === "active" ? t.accent : t.textMuted,
              opacity: state === "waiting" ? 0.4 : 1,
              boxShadow: state === "active" ? `0 0 0 ${4 * scale}px ${t.accentSubtle}` : "none",
            }}>
              {state === "done" ? "✓" : stage.icon}
            </div>

            {/* Label + detail */}
            <div>
              <div style={{
                fontSize: 12 * scale,
                fontWeight: state === "active" ? 600 : 500,
                color: state === "active" ? t.textPrimary : state === "done" ? t.textSecondary : t.textMuted,
                lineHeight: `${26 * scale}px`,
              }}>
                {stage.label}
              </div>
              {state === "active" && detailText && (
                <div style={{ fontSize: 11 * scale, color: t.accent, marginTop: 2 * scale }}>
                  {detailText}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
