# LinkedIn Job Automator

Chrome extension that finds, ranks, and auto-applies to LinkedIn jobs — so you can focus on interviews, not applications.

**Status: Actively building. Contributors welcome.**

---

## What It Does

| Feature | Status |
|---------|--------|
| Fetch 100 remote/Easy Apply jobs in one click | Done |
| 4-layer salary estimation with confidence scores | Done |
| AI match scoring — skills, experience, fit breakdown per job | **New** |
| Applied job detection — filters jobs you've already applied to | **New** |
| Pipeline orchestration — parallel search + enrich + rank | **New** |
| Phased loading UI — visual progress across pipeline stages | **New** |
| Score-based card hierarchy — high-match jobs pop, low ones fade | **New** |
| Automated Easy Apply (form fill, multi-step, submit) | Done |
| Bulk auto-apply across all search results | Done |
| Answer bank — learns your responses, never asks twice | Done |
| Resume upload + AI skill extraction | Done |
| Profile auto-fill (city, phone, work auth, start date) | Done |
| Save / Applied / Rejected tracking with persistence | Done |
| Dark Terminal Luxe design system — Geist font, emerald accent | **New** |
| Company enrichment (PDL, Hunter, Apollo) | Planned |
| AI cover letter generation per job | Planned |
| LinkedIn InMail & cold outreach automation | Planned |
| Personalized resume generation per application | Planned |
| Application analytics dashboard | Planned |

---

## What's New (v2)

Since the first release, the extension went from "search and apply" to a full intelligence pipeline:

### AI Match Scoring
Every job gets a 0-100 match score based on your resume. The LLM evaluates three dimensions — **skills**, **experience**, and **fit** — and returns a one-line explanation. High-scoring jobs get a green-tinted card with prominent badge. Low scores fade. Unscored jobs get a dashed border and "No score" indicator. Click any score badge to expand the full breakdown inline.

### Smart Applied Detection
The extension now queries LinkedIn's GraphQL API to extract `JobSeekerJobState` for every search result. Jobs you've already applied to are automatically marked and filtered from the queue — no wasted clicks, no duplicates.

### Pipeline Orchestration
Search triggers a 4-stage parallel pipeline:
1. **Search** — 4 pages of Voyager API results (100 jobs)
2. **Details** — fetch full descriptions for non-applied jobs (with live progress counter)
3. **Salary** — 4-layer enrichment runs in parallel with descriptions
4. **Rank** — LLM scores all jobs against your resume in batches of 15

The popup shows a phased progress indicator with pipeline stages instead of a generic spinner. Each stage transitions from waiting → active (with pulse) → done (with checkmark).

### Design System Overhaul
"Dark Terminal Luxe" — emerald-tinted neutrals, Geist variable font, proper dark mode contrast. Score-based card hierarchy gives visual weight to the jobs that matter most. Filter tabs with count pills. Flattened layouts (no card-in-card nesting). Glassmorphism used purposefully on modals only.

---

## How It Works

```
LinkedIn Page
    |
    v
Content Script — Voyager API search + GraphQL applied-state detection
    |
    v
Extension Popup (React 19 + Zustand) — pipeline orchestration, live progress
    |                                      |
    v                                      v
Background Script                    Backend API (Express)
  - Message routing                    - Salary enrichment (4 layers)
  - Tab management                     - Job ranking (GPT-4o-mini)
  - Keepalive                          - Profile + answer bank (MongoDB)
    |
    v
Easy Apply Controller — Shadow DOM traversal, form fill, multi-step nav
```

### Salary Estimation — 4 Layers

1. **LinkedIn Native** — salary data straight from the job posting when LinkedIn provides it (0.98 confidence)
2. **Coresignal API** — real salary data from aggregated job postings across multiple sources (0.90 confidence)
3. **GPT-4o-mini** — market-rate estimation when data is sparse (0.80 confidence)
4. **Algorithm fallback** — seniority multipliers, role adjustments, geo-based cost-of-living across 15+ markets (0.75 confidence)

Jobs with LinkedIn-native salary skip the backend entirely. Every estimate shows its confidence score and source. No guessing.

### AI Match Scoring

Upload your resume and the extension sends each job's description + your parsed skills to GPT-4o-mini. Returns:
- **Overall** (0-100) — weighted composite
- **Skills** (0-100) — how well your skills match the JD
- **Experience** (0-100) — years and seniority alignment
- **Fit** (0-100) — culture, location, role type match
- **Reasoning** — one-line explanation

Jobs are ranked by overall score. Cards visually scale: high-match jobs get emerald borders and gradient backgrounds, low-match jobs fade, unscored jobs show dashed borders.

### Easy Apply Automation

- Detects form fields: text, dropdowns, radio buttons, checkboxes, textareas, resume upload
- Traverses Shadow DOM (LinkedIn's modern UI)
- Fills from profile data, saved answers, or AI-generated responses
- Handles multi-step forms: Next > Next > Review > Submit
- Detects success dialog and closes modal
- Bulk mode: opens tab > applies > closes > next — fully hands-free

---

## Quick Start

### 1. Clone

```bash
git clone https://github.com/4ugusta/linkedin-job-automator.git
cd linkedin-job-automator
```

### 2. Backend

```bash
cd job-search-backend
npm install
cp .env.example .env    # Fill in your API keys
npm run dev             # Runs on localhost:3001
```

### 3. Extension

```bash
cd job-search-extension
npm install
npm run build
```

Then in Chrome:
1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** > select the `dist/` folder

### 4. Use

1. Open [linkedin.com](https://linkedin.com)
2. Click the extension panel on the right side
3. Enter keywords, pick location, hit Search
4. Watch the pipeline: search → details → salary → match scoring
5. Review ranked jobs — high matches at the top
6. Use Auto Apply to bulk-apply hands-free

---

## Tech Stack

**Extension** — React 19, TypeScript, Tailwind CSS 4, Vite 7, Chrome Manifest V3, Zustand

**Backend** — Express 5, TypeScript, MongoDB (Mongoose), OpenAI (GPT-4o-mini), Coresignal API

**Design** — Geist Variable Font, emerald accent system, score-based card hierarchy, pipeline progress UI

**Automation** — Chrome Content Scripts, Shadow DOM traversal, MutationObserver, LinkedIn Voyager API, LinkedIn GraphQL API

---

## Project Structure

```
linkedin-job-automator/
├── job-search-extension/       # Chrome extension (React + TypeScript)
│   ├── src/
│   │   ├── popup/              # Extension UI (App.tsx, design system CSS)
│   │   ├── components/         # SearchView, JobCard, JobListView, BulkApply, etc.
│   │   ├── hooks/              # useJobSearch (pipeline), useAutoApply
│   │   ├── store/              # Zustand stores (jobs, profile, autoApply, questions)
│   │   ├── types/              # Shared interfaces (Job, MatchScore, etc.)
│   │   ├── content/            # Content scripts injected into LinkedIn
│   │   │   └── easyApply/      # Auto-apply controller + DOM selectors
│   │   └── background/         # Service worker, message routing, API proxy
│   ├── public/                 # Extension icons + Geist fonts
│   └── manifest.json           # Chrome MV3 config
│
├── job-search-backend/         # API server (Express + TypeScript)
│   └── src/
│       ├── routes/             # salary, ranking, profile, questions, ai
│       ├── models/             # UserProfile, QuestionAnswer (Mongoose)
│       ├── services/           # aiAnswerService (OpenAI)
│       └── server.ts           # Express setup + middleware
│
├── CLAUDE.md                   # AI assistant context (architecture + conventions)
├── LICENSE                     # MIT
└── README.md
```

---

## Contributing

This is an active project and contributions are welcome — from first-time PRs to architecture-level changes.

### Areas Where Help Is Needed

| Area | What's Involved | Good For |
|------|----------------|----------|
| **Cover Letter Generator** | GPT integration, template system, PDF export | Backend + AI |
| **InMail Automation** | LinkedIn messaging API, personalization, follow-up sequences | Full-stack |
| **Cold Outreach Pipeline** | PDL/Hunter/Apollo integration, email/SMS sending via Brevo | Backend + APIs |
| **Resume Tailoring** | Per-job resume edits, PDF generation, skill emphasis | AI + PDF |
| **Analytics Dashboard** | Track apply > response > interview conversion | Frontend |
| **Semantic Answer Matching** | Fuzzy/embedding-based question matching for answer bank | AI/ML |
| **Testing** | Unit tests, E2E with Playwright, CI pipeline | DevOps + QA |
| **Documentation** | API docs, architecture diagrams, video walkthroughs | Technical writing |

### How to Contribute

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Push and open a PR with a clear description of what and why

No contribution is too small. Bug reports, typo fixes, and "this UX confused me" issues are all valuable.

### Running Locally for Development

```bash
# Backend (hot-reload)
cd job-search-backend && npm run dev

# Extension (hot-reload via CRXJS)
cd job-search-extension && npm run dev
```

---

## Roadmap

### Now
- Stabilize bulk auto-apply across edge cases (SDUI flows, non-standard forms)
- Improve answer bank with semantic/fuzzy matching
- Chrome Web Store listing

### Next
- AI cover letter generation — personalized per job, not template garbage
- Company data enrichment (CEO, CTO, HR contacts via PDL + Hunter)
- LinkedIn InMail drafting with smart follow-up sequences
- Cold email/text outreach from the extension via Brevo

### Later
- Personalized resume generation per application
- Application analytics (what's converting, what's not)
- Multi-platform support (Indeed, Glassdoor)

---

## License

MIT — use it, fork it, build on it.

---

**Built out of frustration with the job search grind. If you feel the same, jump in.**
