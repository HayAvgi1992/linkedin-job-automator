# Remotion Demo Video — Design Spec

## Overview

A ~65 second animated product demo video for the LinkedIn Job Automator Chrome extension, built with Remotion (React-based video framework). The video renders to MP4 at 1080×1350 (4:5 portrait) for maximum LinkedIn feed presence.

**Style:** Hybrid — real UI components as the hero, with bold stat/text cards as rhythm breaks between scenes.

**Audience:** LinkedIn (job seekers + developers/contributors). Must work on autoplay (no audio dependence) and stop the scroll within 3 seconds.

## Technical Setup

### Project Location

```
job-search-extension/
├── src/              ← existing extension code
├── video/            ← new Remotion project (separate from extension build)
│   ├── src/
│   │   ├── Root.tsx              ← Remotion root, registers composition
│   │   ├── DemoVideo.tsx         ← main composition (sequences all scenes)
│   │   ├── scenes/
│   │   │   ├── HookScene.tsx     ← opening text card
│   │   │   ├── SearchScene.tsx   ← search form interaction
│   │   │   ├── PipelineScene.tsx ← 3-stage pipeline animation
│   │   │   ├── StatCard.tsx      ← reusable stat/text card component
│   │   │   ├── ResultsScene.tsx  ← job cards loading + scroll
│   │   │   ├── ScoreScene.tsx    ← match badge expand
│   │   │   ├── ApplyScene.tsx    ← bulk apply running
│   │   │   ├── SummaryScene.tsx  ← results badges
│   │   │   └── OutroScene.tsx    ← repo CTA
│   │   ├── components/
│   │   │   ├── ExtensionFrame.tsx  ← chrome extension popup shell
│   │   │   ├── MockJobCard.tsx     ← simplified job card for video
│   │   │   ├── MockPipeline.tsx    ← pipeline progress (inline styles, NOT importing extension CSS)
│   │   │   ├── TypeWriter.tsx      ← text typing animation
│   │   │   └── AnimatedNumber.tsx  ← number count-up animation
│   │   ├── data/
│   │   │   └── mockJobs.ts       ← curated job data (titles, scores, salaries)
│   │   └── styles/
│   │       └── theme.ts          ← color tokens matching extension design system
│   ├── public/
│   │   └── fonts/                ← Geist woff2 files (copied from extension)
│   ├── package.json
│   └── tsconfig.json
```

### Why Separate from Extension Build

Remotion has its own webpack/bundler config and heavy dependencies (~50MB). Keeping it in `video/` means:
- Extension build (`npm run build` in root) is unaffected
- Video dependencies don't bloat the extension
- Can be gitignored or kept — doesn't affect production

### Dependencies

```json
{
  "dependencies": {
    "remotion": "^4.x",
    "@remotion/cli": "^4.x",
    "@remotion/renderer": "^4.x",
    "@remotion/transitions": "^4.x",
    "react": "^19.x",
    "react-dom": "^19.x"
  }
}
```

No Tailwind in the video project — all styles are inline or in plain CSS. The extension's design tokens (colors, radii, fonts) are replicated as a JS theme object in `theme.ts`. Components like `MockPipeline` replicate the visual appearance of the extension's pipeline CSS classes using inline styles derived from the theme — they do NOT import the extension's CSS files.

### Font Loading

The Geist variable fonts are copied from `job-search-extension/public/fonts/` into `video/public/fonts/`. A `fonts.css` file in `video/src/` loads them via `@font-face` and is imported in `Root.tsx`. Remotion's `staticFile()` helper is used to reference the woff2 files from the `public/` directory.

## Video Specification

| Property | Value |
|----------|-------|
| Resolution | 1080 × 1350 (4:5 portrait) |
| FPS | 30 |
| Duration | ~65 seconds (1950 frames) |
| Format | MP4 (H.264) |
| Background | `#060908` (extension bg-base) |
| Font | Geist Variable (copied to video/public/fonts/) |

## Transitions

All scene transitions use `<TransitionSeries>` from `@remotion/transitions`. The default transition between scenes is a **15-frame (0.5s) crossfade** where the outgoing scene fades to 0 opacity while the incoming scene fades to 1. The 15-frame overlap is accounted for in the total duration.

Exceptions:
- **Scene 1 → 2:** The hook text fades out, then the extension frame fades in (crossfade).
- **Scene 4 and 7 (stat cards):** The extension popup uses a `translateY` slide-out (exiting down) while the stat card fades in from center. The reverse happens entering the next UI scene.
- **Scene 9 → 10:** Hard cut — the summary UI disappears and the outro fades in from black.

Enter/exit animations (slide-out, fade-in) happen within each scene's own frame budget. The first and last 15 frames of each scene are reserved for transition overlap.

## Scene Breakdown

All timings in seconds at 30fps. Total: 1950 frames = 65 seconds.

### Scene 1: Hook (0:00 – 0:03, 90 frames)

**Type:** Text card (full screen)

- Dark background (`#060908`)
- Large text fades in with slight upward slide: **"I built a Chrome extension that ranks and auto-applies to 100 LinkedIn jobs."**
- Font: Geist, 36px, bold, `#f0f4f2`
- Emerald accent on key word ("ranks" or "100")
- Animation: `spring()` opacity + translateY

### Scene 2: Search (0:03 – 0:08, 150 frames)

**Type:** UI hero

- Extension popup frame appears (centered, scaled 2x for readability — see ExtensionFrame section)
- The popup shell: header with "JobPilot" title, Search tab active (bg: `accentSubtle`)
- TypeWriter effect types "Software Engineer" into the keywords field
- Location dropdown changes to "Remote (US)"
- "Easy Apply only" checkbox ticks on
- Search button gets clicked (brief scale animation)
- Animation: typing at ~15 chars/sec, field interactions spaced 0.5s apart

### Scene 3: Pipeline (0:08 – 0:16, 240 frames)

**Type:** UI hero (the money shot)

- Search form replaced by pipeline progress
- Stage 1 "Searching LinkedIn" — dot pulses (emerald border + shadow), then checkmark appears (emerald bg, white check)
- Stage 2 "Fetching job details" — becomes active, counter animates (1/47... 12/47... 47/47), then checkmark
- Stage 3 "Analyzing match" — becomes active, pulses, then checkmark
- MockPipeline replicates the visual appearance of the extension's `.pipeline-stage`, `.pipeline-dot`, connector lines — all via inline styles from theme tokens
- Timing: Stage 1 completes at +2s, Stage 2 at +5s, Stage 3 at +7s

### Scene 4: Stat Card (0:16 – 0:19, 90 frames)

**Type:** Text card

- Extension popup slides down (translateY exit)
- Large number "100" scales in (AnimatedNumber from 0→100)
- Subtitle fades in: "jobs ranked by AI match score"
- Emerald accent on "100"

### Scene 5: Results (0:19 – 0:27, 240 frames)

**Type:** UI hero

- Extension popup frame shows job list view
- Filter tabs visible: Queue (47), Saved (0), Applied (0)
- Job cards stagger in from top, each with score-based hierarchy:
  - First card: 94% match → `card-score-high` (emerald border at 35% opacity, subtle gradient bg)
  - Second card: 87% match → `card-score-high` (same, score ≥80)
  - Third card: 72% match → `card-score-mid` (normal border, no emerald)
  - Fourth card: 45% match → `card-score-low` (normal border, 75% opacity)
  - Fifth card: no score → `card-unscored` (dashed border, "No score" badge)
- **Score thresholds:** ≥80 = high, ≥50 = mid, <50 = low (matches `JobCard.tsx` lines 67-73)
- Simulated smooth scroll (translateY animation on card container)
- UI text rendered at 1.5x–2x normal extension sizes for mobile readability (see ExtensionFrame)

### Scene 6: Score Breakdown (0:27 – 0:33, 180 frames)

**Type:** UI detail (zoom)

- Subtle zoom into the top card's match badge area (scale from 1 → 1.3 on the card)
- The "94%" badge gets clicked → breakdown expands (grid-template-rows 0fr → 1fr)
- Score bars animate in sequence:
  - Skills: bar fills to 92%
  - Experience: bar fills to 88%
  - Fit: bar fills to 97%
- Reasoning text fades in: "Strong React/TypeScript match, 5+ years aligns with senior role"
- Brief hold on the expanded state

### Scene 7: Stat Card (0:33 – 0:37, 120 frames)

**Type:** Text card

- "4-layer salary estimation"
- Four lines fade in stacked:
  - "LinkedIn Native → 0.98 confidence"
  - "Coresignal API → 0.90"
  - "GPT-4o-mini → 0.80"
  - "Algorithm → 0.75"
- Each line appears 0.4s apart with slide-up
- Emerald dot before each line

### Scene 8: Bulk Apply (0:37 – 0:50, 390 frames)

**Type:** UI hero

- Switch to Auto Apply tab (tab indicator slides, new tab bg: `accentSubtle`)
- Stats visible: "47 ready · 0 applied"
- "Auto Apply to All (47)" button clicked → scale animation
- Progress bar starts filling
- Current job title cycles through 3-4 jobs:
  - "Senior Frontend Engineer" at Stripe
  - "Full Stack Developer" at Vercel
  - "React Engineer" at Linear
- Applied count ticks: 0 → 1 → 2 → 3
- At the 3-applied mark, a **fast-forward shimmer** effect plays: the progress bar accelerates, job titles flash rapidly, the counter jumps 3 → 8 → 12. Brief visual treatment (~1.5s) to bridge from the detailed view to the completed state.
- Progress bar reaches 100%

### Scene 9: Summary (0:50 – 0:55, 150 frames)

**Type:** UI detail

- Bulk apply shows completed state
- Results badges animate in: "12 applied" (green), "2 skipped" (amber), "1 failed" (red)
- Details section expands briefly showing job names with status icons
- Quick flash — don't linger

### Scene 10: Outro (0:55 – 1:05, 300 frames)

**Type:** CTA card

- Hard cut to dark background
- "Open source. MIT licensed." fades in (Geist, 28px)
- GitHub icon + "github.com/4ugusta/linkedin-job-automator" appears below
- "Contributors welcome." fades in last
- Holds for 5 seconds so viewers can read the URL
- Subtle emerald glow pulse on the repo URL

## Component Design

### ExtensionFrame

Wraps all UI scenes. Renders a Chrome extension popup shell:
- Base width: 380px, base height: 580px (matches real extension popup proportions)
- **Rendered at 2x scale** (760×1160px on the 1080×1350 canvas) — centered with ~160px horizontal margin and ~95px vertical margin. This ensures text inside the mock UI is legible on mobile LinkedIn feeds. All inner text sizes are the extension's real sizes (11-14px) which at 2x become 22-28px rendered.
- Rounded corners (radius-xl: 16px × 2 = 32px rendered) + shadow matching the dark theme
- Header with "JobPilot" branding, tab navigation
- Content area where each scene renders

This is NOT the real extension — it's a simplified visual replica built with inline styles using the theme tokens. It only needs to look right, not function.

### MockJobCard

Simplified job card matching the extension's visual design:
- Title, company, salary, location badges, match score badge
- Score-based border/background hierarchy:
  - `overall >= 80` → emerald border (`rgba(16,185,129,0.35)`), subtle gradient bg
  - `overall >= 50` → normal border (`theme.colors.border`)
  - `overall < 50` → normal border, `opacity: 0.75`
  - no score → dashed border, "No score" badge
- Score breakdown expand animation (grid-template-rows transition)
- Props: `{ title, company, salary, location, matchScore, easyApply, status }`

### MockPipeline

Replicates the extension's pipeline progress using inline styles:
- 3 stages with dot indicators, labels, connector lines
- State management via frame-based interpolation: waiting → active (emerald border, pulsing shadow) → done (emerald fill, white checkmark)
- Does NOT import the extension's CSS — all styles derived from `theme.ts` tokens
- Props: `{ activeStage, detailText }`

### StatCard

Reusable full-screen text card:
- Dark background, centered text
- Props: `{ headline, subtitle, accentWord?, items? }`
- headline renders large (36px bold), subtitle smaller (18px, secondary color)
- `accentWord` highlights one word in emerald
- `items` renders a stacked list with staggered fade-in

### TypeWriter

Animated text typing effect:
- Props: `{ text, startFrame, charsPerSecond }`
- Reveals characters one at a time using `useCurrentFrame()`
- Cursor blink at the end

### AnimatedNumber

Count-up number animation:
- Props: `{ from, to, startFrame, durationFrames }`
- Uses `interpolate()` with spring easing
- Renders in mono font

## Mock Data

`mockJobs.ts` exports an array of ~8 curated jobs with realistic data:

```ts
export const mockJobs = [
  {
    title: "Senior Frontend Engineer",
    company: "Stripe",
    salary: { min: 180000, max: 220000, confidence: 0.98, source: "linkedin" },
    location: "Remote",
    matchScore: { overall: 94, skills: 92, experience: 88, fit: 97,
      reasoning: "Strong React/TypeScript match, 5+ years aligns with senior role" },
    easyApply: true,
  },
  {
    title: "Full Stack Developer",
    company: "Vercel",
    salary: { min: 160000, max: 200000, confidence: 0.90, source: "coresignal" },
    location: "San Francisco, CA",
    matchScore: { overall: 87, skills: 90, experience: 82, fit: 85,
      reasoning: "Next.js expertise valued, location flexible" },
    easyApply: true,
  },
  // ... 6 more with descending scores down to ~38% and one unscored
];
```

Companies chosen to be recognizable but not controversial. Salaries realistic for the roles. Scores descend to show the full card hierarchy. All salary objects include `confidence` to match the extension's `Job.salary` type.

## Theme Tokens

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
};
```

Mirrors the extension's CSS custom properties exactly, including `hover`, `accentSubtle`, `borderFocus`, and all `*Muted` variants.

## Rendering

```bash
cd video
npm install

# Live preview — scrub through frames in browser
npx remotion preview src/Root.tsx

# Render to MP4
npx remotion render src/Root.tsx DemoVideo --output out/demo.mp4 --codec h264
```

Preview allows scrubbing through frames. Final render produces the MP4 for LinkedIn upload.

## What This Does NOT Include

- **Audio/music** — user adds separately in post-production
- **Real LinkedIn data** — all mock data, no API calls
- **Extension functionality** — visual replica only, no Chrome APIs
- **Voiceover timing** — pacing works for silent autoplay; voiceover can be added to match later

## Success Criteria

1. Video renders to MP4 without errors
2. All 10 scenes play in sequence with smooth transitions (15-frame crossfades)
3. UI scenes look visually identical to the real extension at 2x scale
4. Stat cards and UI text are readable on LinkedIn mobile (phone screens)
5. Outro holds long enough to read the GitHub URL
6. Total duration ~65 seconds (1950 frames at 30fps)
7. Score-based card hierarchy matches extension thresholds (≥80/≥50/<50)
