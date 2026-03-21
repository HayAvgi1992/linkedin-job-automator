import { theme } from "../styles/theme";
import type { MockJob } from "../data/mockJobs";

interface MockJobCardProps {
  job: MockJob;
  scoreOpen?: boolean;
  barProgress?: number; // 0-1, animates score bar fill widths
  scale?: number;
}

export const MockJobCard = ({ job, scoreOpen = false, barProgress = 1, scale = 2 }: MockJobCardProps) => {
  const t = theme.colors;
  const score = job.matchScore?.overall;

  // Score-based hierarchy
  const borderColor = score !== undefined
    ? score >= 80 ? "rgba(16, 185, 129, 0.35)"
    : score >= 50 ? t.border
    : t.border
    : t.border;

  const borderStyle = score === undefined ? "dashed" : "solid";

  const cardOpacity = score !== undefined && score < 50 ? 0.75 : 1;

  const bgGradient = score !== undefined && score >= 80
    ? `linear-gradient(135deg, ${t.surface} 0%, rgba(16, 185, 129, 0.05) 100%)`
    : t.surface;

  const scoreBadgeColor = score !== undefined
    ? score >= 80 ? t.success
    : score >= 50 ? t.accent
    : t.textMuted
    : t.textMuted;

  const scoreBadgeBg = score !== undefined
    ? score >= 80 ? t.successMuted
    : score >= 50 ? t.accentMuted
    : t.elevated
    : t.elevated;

  return (
    <div style={{
      background: bgGradient,
      border: `${scale}px ${borderStyle} ${borderColor}`,
      borderRadius: theme.radius.lg * scale,
      padding: 14 * scale,
      opacity: cardOpacity,
      boxShadow: `0 ${scale}px ${3 * scale}px rgba(0,0,0,0.2)`,
      fontFamily: theme.fonts.sans,
    }}>
      {/* Title + score badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 * scale, marginBottom: 4 * scale }}>
        <div style={{
          fontSize: 14 * scale,
          fontWeight: 600,
          color: t.textPrimary,
          lineHeight: 1.3,
          flex: 1,
        }}>
          {job.title}
        </div>
        {score !== undefined ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 3 * scale,
            padding: `${2 * scale}px ${8 * scale}px`,
            borderRadius: 99,
            fontSize: 10 * scale,
            fontWeight: 700,
            color: scoreBadgeColor,
            background: scoreBadgeBg,
            flexShrink: 0,
          }}>
            {score}%
            <span style={{ fontSize: 8 * scale }}>▾</span>
          </div>
        ) : null}
      </div>

      {/* Company */}
      <div style={{ fontSize: 11 * scale, color: t.textSecondary, marginBottom: 8 * scale }}>
        {job.company}
      </div>

      {/* Score breakdown (expandable) */}
      {scoreOpen && job.matchScore && (
        <div style={{
          marginBottom: 10 * scale,
          paddingBottom: 10 * scale,
          borderBottom: `${scale}px solid ${t.border}`,
        }}>
          {(["Skills", "Experience", "Fit"] as const).map((label) => {
            const key = label.toLowerCase() as "skills" | "experience" | "fit";
            const value = job.matchScore![key];
            return (
              <div key={label} style={{
                display: "flex",
                alignItems: "center",
                gap: 8 * scale,
                marginBottom: 6 * scale,
              }}>
                <span style={{ fontSize: 10 * scale, color: t.textMuted, width: 64 * scale }}>{label}</span>
                <div style={{
                  flex: 1,
                  height: 3 * scale,
                  borderRadius: 2 * scale,
                  background: t.elevated,
                }}>
                  <div style={{
                    height: "100%",
                    width: `${value * barProgress}%`,
                    borderRadius: 2 * scale,
                    background: t.accent,
                  }} />
                </div>
                <span style={{
                  fontSize: 10 * scale,
                  color: t.textPrimary,
                  fontWeight: 500,
                  fontFamily: theme.fonts.mono,
                  width: 28 * scale,
                  textAlign: "right",
                }}>
                  {value}%
                </span>
              </div>
            );
          })}
          {job.matchScore.reasoning && (
            <div style={{
              fontSize: 10 * scale,
              color: t.textMuted,
              marginTop: 4 * scale,
              lineHeight: 1.4,
            }}>
              {job.matchScore.reasoning}
            </div>
          )}
        </div>
      )}

      {/* Salary */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 * scale, marginBottom: 8 * scale }}>
        <span style={{
          fontFamily: theme.fonts.mono,
          fontSize: 12 * scale,
          fontWeight: 600,
          color: t.textPrimary,
        }}>
          ${Math.round(job.salary.min / 1000)}k–${Math.round(job.salary.max / 1000)}k
        </span>
        <span style={{
          fontSize: 10 * scale,
          fontWeight: 500,
          padding: `${2 * scale}px ${7 * scale}px`,
          borderRadius: theme.radius.sm * scale,
          background: job.salary.source === "linkedin" ? t.infoMuted : job.salary.source === "coresignal" ? t.successMuted : t.warningMuted,
          color: job.salary.source === "linkedin" ? t.info : job.salary.source === "coresignal" ? t.success : t.warning,
        }}>
          {job.salary.source === "linkedin" ? "LinkedIn" : job.salary.source === "coresignal" ? "Market" : "AI est."}
        </span>
      </div>

      {/* Tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 * scale, marginBottom: 12 * scale }}>
        {job.location && (
          <span style={{
            fontSize: 10 * scale,
            fontWeight: 500,
            padding: `${2 * scale}px ${7 * scale}px`,
            borderRadius: theme.radius.sm * scale,
            background: t.elevated,
            color: t.textSecondary,
          }}>
            📍 {job.location}
          </span>
        )}
        {job.remote && (
          <span style={{
            fontSize: 10 * scale,
            fontWeight: 500,
            padding: `${2 * scale}px ${7 * scale}px`,
            borderRadius: theme.radius.sm * scale,
            background: t.infoMuted,
            color: t.info,
          }}>
            Remote
          </span>
        )}
        {job.easyApply && (
          <span style={{
            fontSize: 10 * scale,
            fontWeight: 500,
            padding: `${2 * scale}px ${7 * scale}px`,
            borderRadius: theme.radius.sm * scale,
            background: t.successMuted,
            color: t.success,
          }}>
            ⚡ Easy Apply
          </span>
        )}
        {score === undefined && (
          <span style={{
            fontSize: 10 * scale,
            fontWeight: 500,
            padding: `${2 * scale}px ${7 * scale}px`,
            borderRadius: theme.radius.sm * scale,
            background: t.elevated,
            color: t.textMuted,
          }}>
            No score
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div style={{
        display: "flex",
        gap: 6 * scale,
        paddingTop: 10 * scale,
        borderTop: `${scale}px solid ${t.border}`,
      }}>
        <div style={{
          flex: 1,
          height: 28 * scale,
          borderRadius: theme.radius.sm * scale,
          border: `${scale}px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11 * scale,
          fontWeight: 500,
          color: t.textPrimary,
        }}>
          ☆ Save
        </div>
        <div style={{
          flex: 1,
          height: 28 * scale,
          borderRadius: theme.radius.sm * scale,
          background: t.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11 * scale,
          fontWeight: 500,
          color: "#fff",
        }}>
          ⚡ Auto
        </div>
        <div style={{
          width: 28 * scale,
          height: 28 * scale,
          borderRadius: theme.radius.sm * scale,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11 * scale,
          color: t.textMuted,
        }}>
          ✕
        </div>
      </div>
    </div>
  );
};
