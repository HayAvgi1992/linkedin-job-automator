import { useCurrentFrame, interpolate } from "remotion";
import { ExtensionFrame } from "../components/ExtensionFrame";
import { MockJobCard } from "../components/MockJobCard";
import { mockJobs } from "../data/mockJobs";
import { theme } from "../styles/theme";

export const ResultsScene = () => {
  const frame = useCurrentFrame();
  const t = theme.colors;
  const s = 2;

  // Sort by score descending, unscored last
  const sorted = [...mockJobs].sort((a, b) => {
    if (!a.matchScore && !b.matchScore) return 0;
    if (!a.matchScore) return 1;
    if (!b.matchScore) return -1;
    return b.matchScore.overall - a.matchScore.overall;
  });

  // Show first 5 cards
  const visibleJobs = sorted.slice(0, 5);

  // Scroll simulation: after cards load, translate container up
  const scrollStart = 120; // 4s — cards have loaded by then
  const scrollY = interpolate(frame, [scrollStart, scrollStart + 90], [0, -200 * s], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 6 * s, marginBottom: 12 * s }}>
          {[
            { label: "Queue", count: 47, active: true },
            { label: "Saved", count: 0, active: false },
            { label: "Applied", count: 0, active: false },
          ].map((tab) => (
            <div key={tab.label} style={{
              flex: 1,
              height: 32 * s,
              borderRadius: theme.radius.md * s,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6 * s,
              fontSize: 12 * s,
              fontWeight: tab.active ? 600 : 500,
              color: tab.active ? t.accent : t.textSecondary,
              background: tab.active ? t.accentMuted : "transparent",
              border: tab.active ? `${s}px solid rgba(16,185,129,0.2)` : `${s}px solid transparent`,
            }}>
              {tab.label}
              <span style={{
                fontFamily: theme.fonts.mono,
                fontSize: 10 * s,
                fontWeight: 600,
                minWidth: 18 * s,
                height: 18 * s,
                borderRadius: 9 * s,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: tab.active ? t.accent : t.elevated,
                color: tab.active ? "#fff" : t.textMuted,
                padding: `0 ${5 * s}px`,
              }}>
                {tab.count}
              </span>
            </div>
          ))}
        </div>

        {/* Job cards with scroll */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 8 * s,
          transform: `translateY(${scrollY}px)`,
          overflow: "hidden",
        }}>
          {visibleJobs.map((job, i) => {
            const staggerDelay = 15 + i * 10;
            const cardOpacity = interpolate(frame, [staggerDelay, staggerDelay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const cardY = interpolate(frame, [staggerDelay, staggerDelay + 15], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{ opacity: cardOpacity, transform: `translateY(${cardY}px)` }}>
                <MockJobCard job={job} />
              </div>
            );
          })}
        </div>
      </ExtensionFrame>
    </div>
  );
};
