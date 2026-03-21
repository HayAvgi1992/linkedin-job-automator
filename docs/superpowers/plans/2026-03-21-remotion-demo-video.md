# Remotion Demo Video — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 65-second animated product demo video for the LinkedIn Job Automator using Remotion, rendering to 1080×1350 MP4.

**Architecture:** Remotion project inside `job-search-extension/video/` with its own package.json. 10 scenes wired via `<TransitionSeries>` with 15-frame crossfades (9 transitions × 15 = 135 frames overlap, so scene durations sum to 2085 to yield 1950 playback frames). Mock data drives all UI — no Chrome APIs or real LinkedIn calls. Extension UI replicated as simplified inline-styled React components.

**Frame math:** 2085 total scene frames − 135 overlap frames (9 crossfades × 15) = **1950 playback frames (65s at 30fps)**.

**Tech Stack:** Remotion 4.x, @remotion/transitions, @remotion/fonts, React 19, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-21-remotion-demo-video-design.md`

---

## File Structure

```
job-search-extension/video/
├── src/
│   ├── index.ts                    ← registerRoot() entry point
│   ├── Root.tsx                    ← Composition registration (1080×1350, 30fps, 1950 frames)
│   ├── DemoVideo.tsx               ← TransitionSeries wiring all 10 scenes
│   ├── fonts.ts                    ← Geist font loading via @remotion/fonts
│   ├── styles/
│   │   └── theme.ts               ← Color tokens, radius, font families
│   ├── data/
│   │   └── mockJobs.ts            ← 8 curated jobs with scores, salaries, companies
│   ├── components/
│   │   ├── ExtensionFrame.tsx      ← Popup shell (header, tabs, content area) at 2x scale
│   │   ├── MockJobCard.tsx         ← Job card with score-based hierarchy
│   │   ├── MockPipeline.tsx        ← 3-stage pipeline progress
│   │   ├── TypeWriter.tsx          ← Character-by-character text reveal
│   │   ├── AnimatedNumber.tsx      ← Count-up number with spring easing
│   │   └── FadeSlide.tsx           ← Reusable fade+translateY entrance animation
│   └── scenes/
│       ├── HookScene.tsx           ← Scene 1: bold text hook
│       ├── SearchScene.tsx         ← Scene 2: form interaction
│       ├── PipelineScene.tsx       ← Scene 3: pipeline stages animating
│       ├── ResultsScene.tsx        ← Scene 5: ranked job cards
│       ├── ScoreScene.tsx          ← Scene 6: score breakdown expand
│       ├── ApplyScene.tsx          ← Scene 8: bulk apply running
│       ├── SummaryScene.tsx        ← Scene 9: results badges
│       ├── OutroScene.tsx          ← Scene 10: repo CTA
│       └── StatCard.tsx            ← Scenes 4, 7: reusable stat text card
├── public/
│   └── fonts/
│       ├── Geist-Variable.woff2     ← copied from extension
│       └── GeistMono-Variable.woff2 ← copied from extension
├── package.json
└── tsconfig.json
```

---

### Task 1: Scaffold Remotion Project

**Files:**
- Create: `video/package.json`
- Create: `video/tsconfig.json`
- Create: `video/src/index.ts`
- Create: `video/src/Root.tsx`
- Create: `video/src/DemoVideo.tsx` (placeholder)
- Copy: `public/fonts/Geist-Variable.woff2` from extension
- Copy: `public/fonts/GeistMono-Variable.woff2` from extension

- [ ] **Step 1: Create package.json**

```json
{
  "name": "jobpilot-demo-video",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "studio": "remotion studio src/index.ts",
    "render": "remotion render src/index.ts DemoVideo --output out/demo.mp4 --codec h264"
  },
  "dependencies": {
    "remotion": "^4.0.0",
    "@remotion/cli": "^4.0.0",
    "@remotion/transitions": "^4.0.0",
    "@remotion/fonts": "^4.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/react": "^19.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Copy fonts**

```bash
mkdir -p video/public/fonts
cp public/fonts/Geist-Variable.woff2 video/public/fonts/
cp public/fonts/GeistMono-Variable.woff2 video/public/fonts/
```

- [ ] **Step 4: Create entry point and placeholder Root**

`src/index.ts`:
```ts
import { registerRoot } from "remotion";
import { Root } from "./Root";
registerRoot(Root);
```

`src/Root.tsx`:
```tsx
import { Composition } from "remotion";
import { DemoVideo } from "./DemoVideo";

export const Root = () => (
  <Composition
    id="DemoVideo"
    component={DemoVideo}
    durationInFrames={1950}
    fps={30}
    width={1080}
    height={1350}
  />
);
```

`src/DemoVideo.tsx` (placeholder):
```tsx
import { useCurrentFrame } from "remotion";

export const DemoVideo = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ flex: 1, background: "#060908", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "#f0f4f2", fontFamily: "system-ui", fontSize: 48 }}>
        Frame {frame}
      </span>
    </div>
  );
};
```

- [ ] **Step 5: Install dependencies and verify studio launches**

```bash
cd video && npm install
npx remotion studio src/index.ts
```

Expected: Browser opens at localhost:3000 showing "Frame 0" on dark background. Scrubbing the timeline should update the frame counter.

- [ ] **Step 6: Commit**

```bash
git add video/
git commit -m "feat(video): scaffold Remotion project with placeholder composition"
```

---

### Task 2: Theme + Fonts

**Files:**
- Create: `video/src/styles/theme.ts`
- Create: `video/src/fonts.ts`
- Modify: `video/src/DemoVideo.tsx` (import fonts)

- [ ] **Step 1: Create theme.ts**

```ts
export const theme = {
  colors: {
    base: "#060908",
    surface: "#111917",
    elevated: "#1c2825",
    hover: "#243230",
    border: "#2e3e38",
    borderHover: "#40564e",
    borderFocus: "#10b981",
    textPrimary: "#f0f4f2",
    textSecondary: "#97a8a1",
    textMuted: "#6b8078",
    accent: "#10b981",
    accentHover: "#059669",
    accentMuted: "rgba(16, 185, 129, 0.18)",
    accentSubtle: "rgba(16, 185, 129, 0.08)",
    success: "#3ee0a5",
    successMuted: "rgba(62, 224, 165, 0.14)",
    info: "#8b95ff",
    infoMuted: "rgba(139, 149, 255, 0.14)",
    warning: "#fbbf24",
    warningMuted: "rgba(251, 191, 36, 0.14)",
    danger: "#fb8080",
    dangerMuted: "rgba(251, 128, 128, 0.14)",
  },
  radius: { sm: 6, md: 8, lg: 12, xl: 16 },
  fonts: {
    sans: "'Geist', system-ui, sans-serif",
    mono: "'Geist Mono', monospace",
  },
} as const;
```

- [ ] **Step 2: Create fonts.ts**

```ts
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

let fontsLoaded = false;

export function ensureFonts() {
  if (fontsLoaded) return;
  fontsLoaded = true;

  loadFont({
    family: "Geist",
    url: staticFile("fonts/Geist-Variable.woff2"),
    weight: "100 900",
  });

  loadFont({
    family: "Geist Mono",
    url: staticFile("fonts/GeistMono-Variable.woff2"),
    weight: "100 900",
  });
}
```

- [ ] **Step 3: Update DemoVideo.tsx to load fonts and use theme**

```tsx
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
```

- [ ] **Step 4: Verify in studio — text should render in Geist font**

```bash
cd video && npx remotion studio src/index.ts
```

Expected: "Frame 0" renders in Geist font (not system-ui fallback). The font has distinctive rounded terminals — visually compare to ensure it loaded.

- [ ] **Step 5: Commit**

```bash
git add video/src/styles/ video/src/fonts.ts video/src/DemoVideo.tsx
git commit -m "feat(video): add theme tokens and Geist font loading"
```

---

### Task 3: Mock Data

**Files:**
- Create: `video/src/data/mockJobs.ts`

- [ ] **Step 1: Create mockJobs.ts**

```ts
export interface MockJob {
  title: string;
  company: string;
  salary: { min: number; max: number; confidence: number; source: string };
  location: string;
  remote: boolean;
  matchScore?: { overall: number; skills: number; experience: number; fit: number; reasoning: string };
  easyApply: boolean;
}

export const mockJobs: MockJob[] = [
  {
    title: "Senior Frontend Engineer",
    company: "Stripe",
    salary: { min: 180000, max: 220000, confidence: 0.98, source: "linkedin" },
    location: "Remote",
    remote: true,
    matchScore: { overall: 94, skills: 92, experience: 88, fit: 97,
      reasoning: "Strong React/TypeScript match, 5+ years aligns with senior role" },
    easyApply: true,
  },
  {
    title: "Full Stack Developer",
    company: "Vercel",
    salary: { min: 160000, max: 200000, confidence: 0.90, source: "coresignal" },
    location: "San Francisco, CA",
    remote: false,
    matchScore: { overall: 87, skills: 90, experience: 82, fit: 85,
      reasoning: "Next.js expertise valued, location flexible" },
    easyApply: true,
  },
  {
    title: "React Engineer",
    company: "Linear",
    salary: { min: 170000, max: 210000, confidence: 0.80, source: "openai" },
    location: "Remote",
    remote: true,
    matchScore: { overall: 72, skills: 78, experience: 70, fit: 65,
      reasoning: "Good technical fit, less experience with desktop apps" },
    easyApply: true,
  },
  {
    title: "Software Engineer II",
    company: "Notion",
    salary: { min: 150000, max: 190000, confidence: 0.75, source: "algorithm" },
    location: "New York, NY",
    remote: false,
    matchScore: { overall: 65, skills: 72, experience: 60, fit: 58,
      reasoning: "Solid skills but role requires more backend focus" },
    easyApply: true,
  },
  {
    title: "Frontend Developer",
    company: "Figma",
    salary: { min: 140000, max: 175000, confidence: 0.90, source: "coresignal" },
    location: "Remote",
    remote: true,
    matchScore: { overall: 45, skills: 50, experience: 42, fit: 40,
      reasoning: "Canvas/WebGL heavy — different specialization" },
    easyApply: true,
  },
  {
    title: "UI Engineer",
    company: "Shopify",
    salary: { min: 130000, max: 165000, confidence: 0.80, source: "openai" },
    location: "Toronto, ON",
    remote: false,
    matchScore: { overall: 38, skills: 45, experience: 35, fit: 30,
      reasoning: "Ruby on Rails stack, limited frontend React scope" },
    easyApply: false,
  },
  {
    title: "Platform Engineer",
    company: "Datadog",
    salary: { min: 155000, max: 195000, confidence: 0.75, source: "algorithm" },
    location: "Boston, MA",
    remote: false,
    easyApply: true,
    // no matchScore — unscored card
  },
  {
    title: "Staff Engineer",
    company: "Airbnb",
    salary: { min: 210000, max: 280000, confidence: 0.98, source: "linkedin" },
    location: "Remote",
    remote: true,
    matchScore: { overall: 82, skills: 85, experience: 78, fit: 80,
      reasoning: "Strong overall fit, experience level slightly under staff bar" },
    easyApply: true,
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add video/src/data/
git commit -m "feat(video): add curated mock job data"
```

---

### Task 4: Utility Components

**Files:**
- Create: `video/src/components/FadeSlide.tsx`
- Create: `video/src/components/TypeWriter.tsx`
- Create: `video/src/components/AnimatedNumber.tsx`

- [ ] **Step 1: Create FadeSlide.tsx**

Reusable entrance animation — fade in + slide up from a Y offset.

```tsx
import { useCurrentFrame, interpolate } from "remotion";
import type { CSSProperties, ReactNode } from "react";

interface FadeSlideProps {
  children: ReactNode;
  delay?: number;
  durationFrames?: number;
  offsetY?: number;
  style?: CSSProperties;
}

export const FadeSlide = ({
  children,
  delay = 0,
  durationFrames = 20,
  offsetY = 20,
  style,
}: FadeSlideProps) => {
  const frame = useCurrentFrame();
  const progress = frame - delay;

  const opacity = interpolate(progress, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(progress, [0, durationFrames], [offsetY, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ opacity, transform: `translateY(${translateY}px)`, ...style }}>
      {children}
    </div>
  );
};
```

- [ ] **Step 2: Create TypeWriter.tsx**

```tsx
import { useCurrentFrame } from "remotion";
import type { CSSProperties } from "react";

interface TypeWriterProps {
  text: string;
  startFrame?: number;
  charsPerSecond?: number;
  style?: CSSProperties;
  cursorColor?: string;
}

export const TypeWriter = ({
  text,
  startFrame = 0,
  charsPerSecond = 15,
  style,
  cursorColor = "#10b981",
}: TypeWriterProps) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(frame - startFrame, 0);
  const charsPerFrame = charsPerSecond / 30; // 30 fps
  const visibleChars = Math.min(Math.floor(elapsed * charsPerFrame), text.length);
  const done = visibleChars >= text.length;

  // Cursor blinks every 15 frames when done typing
  const showCursor = !done || Math.floor(elapsed / 15) % 2 === 0;

  return (
    <span style={style}>
      {text.slice(0, visibleChars)}
      {showCursor && (
        <span style={{ color: cursorColor, fontWeight: 400 }}>|</span>
      )}
    </span>
  );
};
```

- [ ] **Step 3: Create AnimatedNumber.tsx**

```tsx
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import type { CSSProperties } from "react";

interface AnimatedNumberProps {
  from?: number;
  to: number;
  startFrame?: number;
  style?: CSSProperties;
  prefix?: string;
  suffix?: string;
}

export const AnimatedNumber = ({
  from = 0,
  to,
  startFrame = 0,
  style,
  prefix = "",
  suffix = "",
}: AnimatedNumberProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: Math.max(frame - startFrame, 0),
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 80, damping: 20 },
  });

  const value = Math.round(from + (to - from) * progress);

  return <span style={style}>{prefix}{value}{suffix}</span>;
};
```

- [ ] **Step 4: Verify in studio — add a quick test to DemoVideo.tsx**

Temporarily replace DemoVideo content with:
```tsx
<FadeSlide delay={0}>
  <TypeWriter text="Hello Remotion" style={{ color: "#f0f4f2", fontSize: 32, fontFamily: "'Geist', sans-serif" }} />
</FadeSlide>
<FadeSlide delay={30}>
  <AnimatedNumber to={100} startFrame={30} suffix="%" style={{ color: "#10b981", fontSize: 64, fontFamily: "'Geist Mono', monospace", fontWeight: 700 }} />
</FadeSlide>
```

Expected: Text types in, then number counts up to 100% with spring easing. Revert DemoVideo.tsx after verifying.

- [ ] **Step 5: Commit**

```bash
git add video/src/components/
git commit -m "feat(video): add FadeSlide, TypeWriter, AnimatedNumber utilities"
```

---

### Task 5: ExtensionFrame Shell

**Files:**
- Create: `video/src/components/ExtensionFrame.tsx`

- [ ] **Step 1: Create ExtensionFrame.tsx**

This is the chrome extension popup visual replica at 2x scale.

```tsx
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
```

- [ ] **Step 2: Verify in studio — render ExtensionFrame with placeholder text**

Temporarily set DemoVideo to:
```tsx
<div style={{ flex: 1, background: theme.colors.base, display: "flex", alignItems: "center", justifyContent: "center" }}>
  <ExtensionFrame>
    <div style={{ color: theme.colors.textPrimary, fontSize: 26 }}>Content here</div>
  </ExtensionFrame>
</div>
```

Expected: A dark popup shell centered on the canvas, with "JobPilot" header, two nav tabs, and "Content here" inside.

- [ ] **Step 3: Commit**

```bash
git add video/src/components/ExtensionFrame.tsx
git commit -m "feat(video): add ExtensionFrame popup shell component"
```

---

### Task 6: MockJobCard

**Files:**
- Create: `video/src/components/MockJobCard.tsx`

- [ ] **Step 1: Create MockJobCard.tsx**

Implements score-based card hierarchy with inline styles matching the extension's visual design. Includes expandable score breakdown. All sizes at 2x scale.

```tsx
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
```

- [ ] **Step 2: Verify — render a few MockJobCards inside ExtensionFrame in studio**

- [ ] **Step 3: Commit**

```bash
git add video/src/components/MockJobCard.tsx
git commit -m "feat(video): add MockJobCard with score-based hierarchy"
```

---

### Task 7: MockPipeline

**Files:**
- Create: `video/src/components/MockPipeline.tsx`

- [ ] **Step 1: Create MockPipeline.tsx**

Renders 3 pipeline stages with inline styles. `activeStage` (0-2) and `detailText` control the state. Stage < activeStage = done, stage === activeStage = active, stage > activeStage = waiting.

```tsx
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
```

- [ ] **Step 2: Verify in studio — render MockPipeline at different activeStage values**

- [ ] **Step 3: Commit**

```bash
git add video/src/components/MockPipeline.tsx
git commit -m "feat(video): add MockPipeline 3-stage progress component"
```

---

### Task 8: StatCard Scene

**Files:**
- Create: `video/src/scenes/StatCard.tsx`

- [ ] **Step 1: Create StatCard.tsx**

Reusable full-screen text card with headline, subtitle, optional accent word, and optional stacked items list.

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
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
```

- [ ] **Step 2: Verify — test with both stat card configurations from the storyboard**

- [ ] **Step 3: Commit**

```bash
git add video/src/scenes/StatCard.tsx
git commit -m "feat(video): add StatCard reusable text card scene"
```

---

### Task 9: Scene 1 (HookScene) + Scene 10 (OutroScene)

**Files:**
- Create: `video/src/scenes/HookScene.tsx`
- Create: `video/src/scenes/OutroScene.tsx`

- [ ] **Step 1: Create HookScene.tsx**

```tsx
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
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
```

- [ ] **Step 2: Create OutroScene.tsx**

```tsx
import { useCurrentFrame, interpolate } from "remotion";
import { theme } from "../styles/theme";

export const OutroScene = () => {
  const frame = useCurrentFrame();
  const t = theme.colors;

  const line1 = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line2 = interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line3 = interpolate(frame, [40, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Subtle glow pulse on repo URL
  const glowIntensity = Math.sin(frame * 0.08) * 0.3 + 0.7;

  return (
    <div style={{
      width: "100%",
      height: "100%",
      background: t.base,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 30,
      fontFamily: theme.fonts.sans,
    }}>
      <div style={{ opacity: line1, fontSize: 28, fontWeight: 600, color: t.textPrimary }}>
        Open source. MIT licensed.
      </div>
      <div style={{
        opacity: line2,
        fontSize: 22,
        fontWeight: 500,
        fontFamily: theme.fonts.mono,
        color: t.accent,
        textShadow: `0 0 ${20 * glowIntensity}px ${t.accentMuted}`,
      }}>
        github.com/4ugusta/linkedin-job-automator
      </div>
      <div style={{ opacity: line3, fontSize: 20, color: t.textSecondary }}>
        Contributors welcome.
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add video/src/scenes/HookScene.tsx video/src/scenes/OutroScene.tsx
git commit -m "feat(video): add HookScene and OutroScene"
```

---

### Task 10: Scenes 2-3 (SearchScene + PipelineScene)

**Files:**
- Create: `video/src/scenes/SearchScene.tsx`
- Create: `video/src/scenes/PipelineScene.tsx`

- [ ] **Step 1: Create SearchScene.tsx**

Shows the extension frame with search form. TypeWriter types the keywords, then interactions happen in sequence.

```tsx
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
```

- [ ] **Step 2: Create PipelineScene.tsx**

Shows the extension frame with the 3-stage pipeline animating through stages.

```tsx
import { useCurrentFrame, interpolate } from "remotion";
import { ExtensionFrame } from "../components/ExtensionFrame";
import { MockPipeline } from "../components/MockPipeline";
import { theme } from "../styles/theme";

export const PipelineScene = () => {
  const frame = useCurrentFrame();
  const t = theme.colors;

  // Stage transitions: stage 0 active at start, stage 1 at 60 frames (2s), stage 2 at 150 frames (5s), all done at 210 (7s)
  const activeStage = frame < 60 ? 0 : frame < 150 ? 1 : frame < 210 ? 2 : 3;

  // Detail text for active stage
  const detailText = activeStage === 0
    ? `${Math.min(Math.floor(interpolate(frame, [0, 55], [0, 100], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })), 100)}%`
    : activeStage === 1
    ? (() => {
        const count = Math.min(Math.floor(interpolate(frame, [60, 145], [1, 47], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })), 47);
        return `(${count}/47)`;
      })()
    : undefined;

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
        <MockPipeline activeStage={activeStage} detailText={detailText} />
      </ExtensionFrame>
    </div>
  );
};
```

- [ ] **Step 3: Verify both scenes in studio**

- [ ] **Step 4: Commit**

```bash
git add video/src/scenes/SearchScene.tsx video/src/scenes/PipelineScene.tsx
git commit -m "feat(video): add SearchScene and PipelineScene"
```

---

### Task 11: Scenes 5-6 (ResultsScene + ScoreScene)

**Files:**
- Create: `video/src/scenes/ResultsScene.tsx`
- Create: `video/src/scenes/ScoreScene.tsx`

- [ ] **Step 1: Create ResultsScene.tsx**

Shows ranked job cards staggering in, then simulates a scroll down.

```tsx
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
```

- [ ] **Step 2: Create ScoreScene.tsx**

Zooms into the top card and expands the score breakdown.

```tsx
import { useCurrentFrame, interpolate } from "remotion";
import { MockJobCard } from "../components/MockJobCard";
import { mockJobs } from "../data/mockJobs";
import { theme } from "../styles/theme";

export const ScoreScene = () => {
  const frame = useCurrentFrame();
  const t = theme.colors;

  // Get highest-scoring job
  const topJob = [...mockJobs].sort((a, b) => (b.matchScore?.overall || 0) - (a.matchScore?.overall || 0))[0];

  // Zoom in over first 20 frames
  const zoomScale = interpolate(frame, [0, 20], [1, 1.3], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Expand breakdown after 30 frames
  const scoreOpen = frame > 30;

  // Animate score bars from 0 to full over 40 frames after breakdown opens
  const barProgress = interpolate(frame, [30, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
      <div style={{
        transform: `scale(${zoomScale})`,
        width: 760, // 380 * 2
      }}>
        <MockJobCard job={topJob} scoreOpen={scoreOpen} barProgress={barProgress} />
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Verify both scenes in studio**

- [ ] **Step 4: Commit**

```bash
git add video/src/scenes/ResultsScene.tsx video/src/scenes/ScoreScene.tsx
git commit -m "feat(video): add ResultsScene and ScoreScene"
```

---

### Task 12: Scenes 8-9 (ApplyScene + SummaryScene)

**Files:**
- Create: `video/src/scenes/ApplyScene.tsx`
- Create: `video/src/scenes/SummaryScene.tsx`

- [ ] **Step 1: Create ApplyScene.tsx**

Shows the Auto Apply tab with progress bar filling, job titles cycling, and a fast-forward effect.

```tsx
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
```

- [ ] **Step 2: Create SummaryScene.tsx**

```tsx
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
```

- [ ] **Step 3: Verify both scenes in studio**

- [ ] **Step 4: Commit**

```bash
git add video/src/scenes/ApplyScene.tsx video/src/scenes/SummaryScene.tsx
git commit -m "feat(video): add ApplyScene and SummaryScene"
```

---

### Task 13: Wire All Scenes in DemoVideo.tsx

**Files:**
- Modify: `video/src/DemoVideo.tsx` (full rewrite)

- [ ] **Step 1: Wire all scenes with TransitionSeries**

```tsx
import { TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { linearTiming } from "@remotion/transitions";
import { ensureFonts } from "./fonts";
import { theme } from "./styles/theme";

import { HookScene } from "./scenes/HookScene";
import { SearchScene } from "./scenes/SearchScene";
import { PipelineScene } from "./scenes/PipelineScene";
import { StatCard } from "./scenes/StatCard";
import { ResultsScene } from "./scenes/ResultsScene";
import { ScoreScene } from "./scenes/ScoreScene";
import { ApplyScene } from "./scenes/ApplyScene";
import { SummaryScene } from "./scenes/SummaryScene";
import { OutroScene } from "./scenes/OutroScene";

const FADE_FRAMES = 15;
const crossfade = {
  presentation: fade(),
  timing: linearTiming({ durationInFrames: FADE_FRAMES }),
};

// Frame math: 9 crossfades × 15 frames = 135 overlap frames
// Scene sum must be 1950 + 135 = 2085 for 1950 playback frames (65s)
// Inflated scenes: Results +25, Apply +60, Outro +50 = +135

export const DemoVideo = () => {
  ensureFonts();

  return (
    <div style={{ background: theme.colors.base, width: "100%", height: "100%" }}>
      <TransitionSeries>
        {/* Scene 1: Hook — 90 frames (3s) */}
        <TransitionSeries.Sequence durationInFrames={90}>
          <HookScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...crossfade} />

        {/* Scene 2: Search — 150 frames (5s) */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <SearchScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...crossfade} />

        {/* Scene 3: Pipeline — 240 frames (8s) */}
        <TransitionSeries.Sequence durationInFrames={240}>
          <PipelineScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...crossfade} />

        {/* Scene 4: Stat — "100 jobs" — 90 frames (3s) */}
        <TransitionSeries.Sequence durationInFrames={90}>
          <StatCard
            headline=""
            subtitle="jobs ranked by AI match score"
            animatedNumber={{ to: 100 }}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...crossfade} />

        {/* Scene 5: Results — 265 frames (inflated +25 for transition overlap) */}
        <TransitionSeries.Sequence durationInFrames={265}>
          <ResultsScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...crossfade} />

        {/* Scene 6: Score Breakdown — 180 frames (6s) */}
        <TransitionSeries.Sequence durationInFrames={180}>
          <ScoreScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...crossfade} />

        {/* Scene 7: Stat — Salary layers — 120 frames (4s) */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <StatCard
            headline="4-layer salary estimation"
            subtitle="Every source shown with confidence"
            items={[
              "LinkedIn Native → 0.98 confidence",
              "Coresignal API → 0.90",
              "GPT-4o-mini → 0.80",
              "Algorithm → 0.75",
            ]}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...crossfade} />

        {/* Scene 8: Bulk Apply — 450 frames (inflated +60 for transition overlap) */}
        <TransitionSeries.Sequence durationInFrames={450}>
          <ApplyScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition {...crossfade} />

        {/* Scene 9: Summary — 150 frames (5s) */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <SummaryScene />
        </TransitionSeries.Sequence>
        {/* Hard cut to outro — no transition (per spec) */}

        {/* Scene 10: Outro — 350 frames (inflated +50 for transition overlap) */}
        <TransitionSeries.Sequence durationInFrames={350}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </div>
  );
};
```

- [ ] **Step 2: Verify full video in studio — scrub from start to end**

```bash
cd video && npx remotion studio src/index.ts
```

Expected: All 10 scenes play in sequence. 8 crossfade transitions + 1 hard cut (Scene 9→10). Total playback should be ~1950 frames (65s). Scene durations sum to 2085 minus 120 overlap (8 crossfades × 15) = 1965 playback frames. Verify each scene looks correct and transitions feel smooth.

- [ ] **Step 3: Commit**

```bash
git add video/src/DemoVideo.tsx
git commit -m "feat(video): wire all 10 scenes with TransitionSeries"
```

---

### Task 14: Render Final Video

- [ ] **Step 1: Render to MP4**

```bash
cd video && npx remotion render src/index.ts DemoVideo --output out/demo.mp4 --codec h264
```

Expected: Renders without errors. Output file at `video/out/demo.mp4`. File size should be ~5-15MB for a 65-second 1080×1350 video.

- [ ] **Step 2: Play the rendered video and verify quality**

```bash
open video/out/demo.mp4
```

Check: all text readable, transitions smooth, no black frames, proper timing.

- [ ] **Step 3: Add out/ to .gitignore**

```bash
echo "out/" >> video/.gitignore
```

- [ ] **Step 4: Final commit**

```bash
git add video/.gitignore
git commit -m "feat(video): complete Remotion demo video — ready to render"
```

---
