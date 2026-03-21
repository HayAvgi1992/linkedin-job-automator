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
