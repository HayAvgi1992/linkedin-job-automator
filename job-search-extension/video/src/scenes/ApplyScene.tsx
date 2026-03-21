import { useCurrentFrame, interpolate } from "remotion";
import { ExtensionFrame } from "../components/ExtensionFrame";
import { theme } from "../styles/theme";

const applyJobs = [
  { title: "Senior Frontend Engineer", company: "Stripe" },
  { title: "Full Stack Developer", company: "Vercel" },
  { title: "React Engineer", company: "Linear" },
];

export const ApplyScene = () => {
  const frame = useCurrentFrame();
  const t = theme.colors;
  const s = 2;

  // Button press animation at frame 30
  const btnPressed = frame > 30;
  const btnScale = interpolate(frame, [30, 35, 40], [1, 0.97, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Progress bar (starts at frame 45)
  const progressStart = 45;
  const slowProgress = interpolate(frame, [progressStart, progressStart + 180], [0, 30], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Fast-forward effect at frame 270 (~9s into scene)
  const isFastForward = frame > 270;
  const fastProgress = interpolate(frame, [270, 330], [30, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const progress = isFastForward ? fastProgress : slowProgress;

  // Current job cycling
  const jobIndex = !btnPressed ? -1
    : frame < 120 ? 0
    : frame < 200 ? 1
    : frame < 270 ? 2
    : -1;

  // Applied count
  const appliedCount = !btnPressed ? 0
    : frame < 120 ? 0
    : frame < 200 ? 1
    : frame < 270 ? 2
    : isFastForward
    ? Math.min(Math.floor(interpolate(frame, [270, 330], [3, 12], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })), 12)
    : 3;

  // Shimmer opacity for fast-forward
  const shimmerOpacity = isFastForward ? interpolate(frame, [270, 280, 320, 330], [0, 0.6, 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

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
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 * s }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 * s }}>
            <span style={{ fontSize: 12 * s, fontWeight: 600, color: t.textPrimary }}>⚡ Bulk Auto Apply</span>
          </div>
          <div style={{ display: "flex", gap: 12 * s, fontSize: 11 * s }}>
            <span style={{ color: t.textSecondary }}>
              <span style={{ fontFamily: theme.fonts.mono, fontWeight: 700, color: t.textPrimary }}>{47 - appliedCount}</span> ready
            </span>
            <span style={{ color: t.success }}>
              <span style={{ fontFamily: theme.fonts.mono, fontWeight: 700 }}>{appliedCount}</span> applied
            </span>
          </div>
        </div>

        {/* Progress bar (visible after button press) */}
        {btnPressed && (
          <div style={{ marginBottom: 12 * s }}>
            <div style={{
              height: 6 * s,
              borderRadius: 3 * s,
              background: t.elevated,
              overflow: "hidden",
              position: "relative",
            }}>
              <div style={{
                height: "100%",
                width: `${Math.min(progress, 100)}%`,
                borderRadius: 3 * s,
                background: t.accent,
              }} />
              {/* Fast-forward shimmer overlay */}
              {shimmerOpacity > 0 && (
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(90deg, transparent, rgba(255,255,255,${shimmerOpacity * 0.3}), transparent)`,
                  backgroundSize: "200% 100%",
                }} />
              )}
            </div>

            {/* Current job */}
            {jobIndex >= 0 && (
              <div style={{ marginTop: 8 * s }}>
                <div style={{ fontSize: 11 * s, fontWeight: 500, color: t.textPrimary }}>
                  {applyJobs[jobIndex].title}
                </div>
                <div style={{ fontSize: 10 * s, color: t.textMuted }}>
                  {applyJobs[jobIndex].company}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Button */}
        <div style={{
          height: 40 * s,
          borderRadius: theme.radius.lg * s,
          background: btnPressed ? `${t.danger}15` : t.accent,
          border: btnPressed ? `${s}px solid ${t.danger}30` : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6 * s,
          fontSize: 13 * s,
          fontWeight: 500,
          color: btnPressed ? t.danger : "#fff",
          transform: `scale(${btnScale})`,
        }}>
          {btnPressed ? "⬛ Stop After Current Job" : `⚡ Auto Apply to All (47)`}
        </div>
      </ExtensionFrame>
    </div>
  );
};
