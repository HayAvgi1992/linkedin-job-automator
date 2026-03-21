import type { CSSProperties, ReactNode } from "react";
import { theme } from "../styles/theme";

interface ExtensionFrameProps {
  children: ReactNode;
  activeTab?: "search" | "autoApply";
  style?: CSSProperties;
}

export const ExtensionFrame = ({
  children,
  activeTab = "search",
  style,
}: ExtensionFrameProps) => {
  const t = theme.colors;
  const scale = 2;
  const width = 380 * scale;

  return (
    <div style={{
      width,
      background: t.base,
      borderRadius: theme.radius.xl * scale,
      border: `${scale}px solid ${t.border}`,
      boxShadow: `0 ${4 * scale}px ${24 * scale}px rgba(0,0,0,0.5)`,
      overflow: "hidden",
      fontFamily: theme.fonts.sans,
      fontSize: 13 * scale,
      ...style,
    }}>
      {/* Header */}
      <div style={{
        background: t.surface,
        borderBottom: `${scale}px solid ${t.border}`,
        padding: `${12 * scale}px ${16 * scale}px`,
      }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 * scale }}>
          <div style={{
            width: 28 * scale,
            height: 28 * scale,
            borderRadius: theme.radius.md * scale,
            background: t.accentMuted,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14 * scale,
          }}>
            <span style={{ color: t.accent }}>⚡</span>
          </div>
          <div>
            <div style={{
              fontSize: 15 * scale,
              fontWeight: 700,
              color: t.textPrimary,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}>
              JobPilot
            </div>
            <div style={{
              fontSize: 10 * scale,
              color: t.textMuted,
              marginTop: 2 * scale,
            }}>
              LinkedIn Automation
            </div>
          </div>
        </div>

        {/* Nav tabs */}
        <div style={{
          display: "flex",
          gap: 4 * scale,
          marginTop: 10 * scale,
        }}>
          {(["search", "autoApply"] as const).map((tab) => {
            const isActive = tab === activeTab;
            return (
              <div key={tab} style={{
                flex: 1,
                padding: `${8 * scale}px 0`,
                fontSize: 12 * scale,
                fontWeight: 500,
                textAlign: "center",
                borderRadius: `${theme.radius.md * scale}px ${theme.radius.md * scale}px 0 0`,
                color: isActive ? t.accent : t.textSecondary,
                background: isActive ? t.accentSubtle : "transparent",
                position: "relative",
              }}>
                {tab === "search" ? "🔍 Search" : "⚡ Auto Apply"}
                {isActive && (
                  <div style={{
                    position: "absolute",
                    bottom: 0,
                    left: 12 * scale,
                    right: 12 * scale,
                    height: 2 * scale,
                    borderRadius: scale,
                    background: t.accent,
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content area */}
      <div style={{ padding: `${16 * scale}px` }}>
        {children}
      </div>
    </div>
  );
};
