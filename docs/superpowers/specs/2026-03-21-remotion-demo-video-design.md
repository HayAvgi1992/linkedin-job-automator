# Remotion Demo Video — Design Spec

## Overview

A 60–75 second animated product demo video for the LinkedIn Job Automator Chrome extension, built with Remotion (React-based video framework). The video renders to MP4 at 1080×1350 (4:5 portrait) for maximum LinkedIn feed presence.

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
│   │   │   ├── MockPipeline.tsx    ← pipeline progress animation
│   │   │   ├── TypeWriter.tsx      ← text typing animation
│   │   │   └── AnimatedNumber.tsx  ← number count-up animation
│   │   ├── data/
│   │   │   └── mockJobs.ts       ← curated job data (titles, scores, salaries)
│   │   └── styles/
│   │       └── theme.ts          ← color tokens matching extension design system
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
    "react": "^19.x",
    "react-dom": "^19.x"
  }
}
```

No Tailwind in the video project — all styles are inline or CSS-in-JS to keep Remotion's bundler simple. The extension's design tokens (colors, radii, fonts) are replicated as a theme object in `theme.ts`.

## Video Specification

| Property | Value |
|----------|-------|
| Resolution | 1080 × 1350 (4:5 portrait) |
| FPS | 30 |
| Duration | ~70 seconds (2100 frames) |
| Format | MP4 (H.264) |
| Background | `#060908` (extension bg-base) |
| Font | Geist Variable (bundled in extension, referenced by video) |

## Scene Breakdown

All timings in seconds. Each scene is a Remotion `<Sequence>` with a `from` (start frame) and `durationInFrames`.

### Scene 1: Hook (0:00 – 0:03, 90 frames)

**Type:** Text card (full screen)

- Dark background (`#060908`)
- Large text fades in with slight upward slide: **"I built a Chrome extension that ranks and auto-applies to 100 LinkedIn jobs."**
- Font: Geist, 36px, bold, `#f0f4f2`
- Emerald accent on key word ("ranks" or "100")
- Animation: `spring()` opacity + translateY

### Scene 2: Search (0:03 – 0:08, 150 frames)

**Type:** UI hero

- Extension popup frame appears (centered, with subtle shadow/border)
- The popup shell: header with "JobPilot" title, Search tab active
- TypeWriter effect types "Software Engineer" into the keywords field
- Location dropdown changes to "Remote (US)"
- "Easy Apply only" checkbox ticks on
- Search button gets clicked (brief scale animation)
- Animation: typing at ~15 chars/sec, field interactions spaced 0.5s apart

### Scene 3: Pipeline (0:08 – 0:16, 240 frames)

**Type:** UI hero (the money shot)

- Search form replaced by pipeline progress
- Stage 1 "Searching LinkedIn" — dot pulses, then checkmark appears
- Stage 2 "Fetching job details" — becomes active, counter animates (1/47... 12/47... 47/47), then checkmark
- Stage 3 "Analyzing match" — becomes active, pulses, then checkmark
- All transitions use the extension's actual pipeline CSS classes/animations
- Timing: Stage 1 completes at +2s, Stage 2 at +5s, Stage 3 at +7s

### Scene 4: Stat Card (0:16 – 0:19, 90 frames)

**Type:** Text card

- Extension popup slides out
- Large number "100" scales in (AnimatedNumber from 0→100)
- Subtitle fades in: "jobs ranked by AI match score"
- Emerald accent on "100"

### Scene 5: Results (0:19 – 0:27, 240 frames)

**Type:** UI hero

- Extension popup frame shows job list view
- Filter tabs visible: Queue (47), Saved (0), Applied (0)
- Job cards stagger in from top, each with:
  - Title, company, salary badge, match score
  - First card: 94% match (green border, emerald tint)
  - Second card: 87% match (green border)
  - Third card: 72% match (normal border)
  - Fourth card: 45% match (faded)
  - Fifth card: no score (dashed border, "No score" badge)
- Simulated smooth scroll down to show more cards
- Each card has realistic data from `mockJobs.ts`

### Scene 6: Score Breakdown (0:27 – 0:33, 180 frames)

**Type:** UI detail (zoom)

- Subtle zoom into the top card's match badge area
- The "94%" badge gets clicked → breakdown expands
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

- Switch to Auto Apply tab (tab indicator slides)
- Stats visible: "47 ready · 0 applied"
- "Auto Apply to All (47)" button clicked → scale animation
- Progress bar starts filling
- Current job title cycles through 3-4 jobs:
  - "Senior Frontend Engineer" at Stripe
  - "Full Stack Developer" at Vercel
  - "React Engineer" at Linear
- Applied count ticks: 0 → 1 → 2 → 3
- Progress bar reaches ~30%
- Brief hold showing the live state

### Scene 9: Summary (0:50 – 0:55, 150 frames)

**Type:** UI detail

- Bulk apply "completes" (progress bar hits 100%)
- Results badges animate in: "12 applied" (green), "2 skipped" (amber), "1 failed" (red)
- Details section expands briefly showing job names with status icons
- Quick flash — don't linger

### Scene 10: Outro (0:55 – 1:05, 300 frames)

**Type:** CTA card

- UI slides away
- "Open source. MIT licensed." fades in (Geist, 28px)
- GitHub icon + "github.com/4ugusta/linkedin-job-automator" appears below
- "Contributors welcome." fades in last
- Holds for 5 seconds so viewers can read the URL
- Subtle emerald glow pulse on the repo URL

## Component Design

### ExtensionFrame

Wraps all UI scenes. Renders a Chrome extension popup shell:
- Fixed width: 380px (extension popup width)
- Rounded corners + shadow matching the dark theme
- Header with "JobPilot" branding, tab navigation
- Content area where each scene renders

This is NOT the real extension — it's a simplified visual replica built with inline styles using the theme tokens. It only needs to look right, not function.

### MockJobCard

Simplified job card matching the extension's visual design:
- Title, company, salary, location badges, match score badge
- Score-based border/background hierarchy (mirrors `.card-score-high/mid/low/unscored`)
- Score breakdown expand animation (mirrors `.score-breakdown` grid-template-rows transition)
- Props: `{ title, company, salary, location, matchScore, easyApply, status }`

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
    salary: { min: 180000, max: 220000, source: "linkedin" },
    location: "Remote",
    matchScore: { overall: 94, skills: 92, experience: 88, fit: 97,
      reasoning: "Strong React/TypeScript match, 5+ years aligns with senior role" },
    easyApply: true,
  },
  {
    title: "Full Stack Developer",
    company: "Vercel",
    salary: { min: 160000, max: 200000, source: "coresignal" },
    location: "San Francisco, CA",
    matchScore: { overall: 87, skills: 90, experience: 82, fit: 85,
      reasoning: "Next.js expertise valued, location flexible" },
    easyApply: true,
  },
  // ... 6 more with descending scores down to ~38% and one unscored
];
```

Companies chosen to be recognizable but not controversial. Salaries realistic for the roles. Scores descend to show the full card hierarchy.

## Theme Tokens

```ts
export const theme = {
  colors: {
    base: "#060908",
    surface: "#111917",
    elevated: "#1c2825",
    border: "#2e3e38",
    borderHover: "#40564e",
    textPrimary: "#f0f4f2",
    textSecondary: "#97a8a1",
    textMuted: "#6b8078",
    accent: "#10b981",
    accentHover: "#059669",
    accentMuted: "rgba(16, 185, 129, 0.18)",
    success: "#3ee0a5",
    successMuted: "rgba(62, 224, 165, 0.14)",
    info: "#8b95ff",
    warning: "#fbbf24",
    danger: "#fb8080",
  },
  radius: { sm: 6, md: 8, lg: 12, xl: 16 },
  fonts: {
    sans: "'Geist', system-ui, sans-serif",
    mono: "'Geist Mono', monospace",
  },
};
```

Mirrors the extension's CSS custom properties exactly.

## Rendering

```bash
cd video
npm install
npx remotion preview    # Live preview in browser at localhost:3000
npx remotion render DemoVideo out/demo.mp4 --codec h264
```

Preview allows scrubbing through frames. Final render produces the MP4 for LinkedIn upload.

## What This Does NOT Include

- **Audio/music** — user adds separately in post-production
- **Real LinkedIn data** — all mock data, no API calls
- **Extension functionality** — visual replica only, no Chrome APIs
- **Voiceover timing** — pacing works for silent autoplay; voiceover can be added to match later

## Success Criteria

1. Video renders to MP4 without errors
2. All 10 scenes play in sequence with smooth transitions
3. UI scenes look visually identical to the real extension
4. Stat cards are readable at LinkedIn mobile resolution (phone screens)
5. Outro holds long enough to read the GitHub URL
6. Total duration 60-75 seconds
