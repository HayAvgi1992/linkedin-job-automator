import { useCurrentFrame, interpolate } from "remotion";
import { ExtensionFrame } from "../components/ExtensionFrame";
import { TypeWriter } from "../components/TypeWriter";
import { theme } from "../styles/theme";

export const SearchScene = () => {
  const frame = useCurrentFrame();
  const t = theme.colors;
  const s = 2; // scale

  // Frame enters with fade + slight scale
  const enterOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const enterScale = interpolate(frame, [0, 15], [0.97, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Interactions timeline
  const showLocation = frame > 60;   // ~2s: location dropdown changes
  const showCheckbox = frame > 80;   // ~2.7s: checkbox ticks
  const showBtnPress = frame > 110;  // ~3.7s: button pressed
  const btnScale = showBtnPress
    ? interpolate(frame, [110, 115, 120], [1, 0.97, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })
    : 1;

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
      <div style={{ opacity: enterOpacity, transform: `scale(${enterScale})` }}>
        <ExtensionFrame activeTab="search">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 * s }}>
            {/* Keywords field */}
            <div>
              <div style={{ fontSize: 12 * s, fontWeight: 500, color: t.textSecondary, marginBottom: 6 * s }}>Job Title or Keywords</div>
              <div style={{
                height: 40 * s,
                border: `${s}px solid ${t.border}`,
                borderRadius: theme.radius.md * s,
                padding: `0 ${12 * s}px`,
                background: t.surface,
                display: "flex",
                alignItems: "center",
              }}>
                <TypeWriter
                  text="Software Engineer"
                  startFrame={15}
                  charsPerSecond={18}
                  style={{ fontSize: 14 * s, color: t.textPrimary, fontFamily: theme.fonts.sans }}
                />
              </div>
            </div>

            {/* Location dropdown */}
            <div>
              <div style={{ fontSize: 12 * s, fontWeight: 500, color: t.textSecondary, marginBottom: 6 * s }}>Location</div>
              <div style={{
                height: 36 * s,
                border: `${s}px solid ${t.border}`,
                borderRadius: theme.radius.md * s,
                padding: `0 ${12 * s}px`,
                background: t.surface,
                display: "flex",
                alignItems: "center",
                fontSize: 13 * s,
                color: showLocation ? t.textPrimary : t.textMuted,
              }}>
                {showLocation ? "Remote (United States)" : "Select location"}
              </div>
            </div>

            {/* Checkbox */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 * s }}>
              <div style={{
                width: 16 * s,
                height: 16 * s,
                borderRadius: 4 * s,
                border: `${1.5 * s}px solid ${showCheckbox ? t.accent : t.borderHover}`,
                background: showCheckbox ? t.accent : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10 * s,
                color: "#fff",
              }}>
                {showCheckbox ? "✓" : ""}
              </div>
              <span style={{ fontSize: 12 * s, fontWeight: 500, color: t.textSecondary }}>Easy Apply only</span>
            </div>

            {/* Search button */}
            <div style={{
              height: 40 * s,
              borderRadius: theme.radius.lg * s,
              background: t.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6 * s,
              fontSize: 13 * s,
              fontWeight: 500,
              color: "#fff",
              transform: `scale(${btnScale})`,
            }}>
              🔍 Search Jobs
            </div>
          </div>
        </ExtensionFrame>
      </div>
    </div>
  );
};
