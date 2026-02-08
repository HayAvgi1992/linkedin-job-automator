# LinkedIn Job Automator

Chrome extension that finds, enriches, and auto-applies to LinkedIn jobs — so you can focus on interviews, not applications.

**Status: Actively building. Contributors welcome.**

---

## What It Does

| Feature | Status |
|---------|--------|
| Fetch 100 remote/Easy Apply jobs in one click | Done |
| 3-layer salary estimation with confidence scores | Done |
| Automated Easy Apply (form fill, multi-step, submit) | Done |
| Bulk auto-apply across all search results | Done |
| Answer bank — learns your responses, never asks twice | Done |
| Resume upload + AI skill extraction | Done |
| Profile auto-fill (city, phone, work auth, start date) | Done |
| Save / Applied / Rejected tracking with persistence | Done |
| JD-resume matching to filter bad fits | In Progress |
| Company enrichment (PDL, Hunter, Apollo) | In Progress |
| AI cover letter generation per job | Planned |
| LinkedIn InMail & cold outreach automation | Planned |
| Personalized resume generation per application | Planned |
| Application analytics dashboard | Planned |

---

## How It Works

```
LinkedIn Page
    |
    v
Content Script — calls LinkedIn Voyager API, fetches 4 pages x 25 jobs
    |
    v
Extension Popup (React) — displays jobs, filters, actions
    |
    v
Background Script — routes messages between popup, content script, and backend
    |
    v
Backend API (Express) — salary enrichment, profile storage, answer bank
    |
    v
Easy Apply Controller — DOM manipulation, Shadow DOM traversal,
                         form detection, auto-fill, multi-step navigation
```

### Salary Estimation — 3 Layers

1. **Coresignal API** — real salary data from aggregated job postings (0.90 confidence)
2. **GPT-4o-mini** — market-rate estimation when data is sparse (0.80 confidence)
3. **Algorithm fallback** — seniority multipliers, role adjustments, geo-based cost-of-living across 15+ markets (0.75 confidence)

Every salary shows its confidence score. No guessing.

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
git clone https://github.com/YOUR_USERNAME/linkedin-job-automator.git
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
4. Watch 100 jobs load with salary estimates
5. Use Auto Apply to bulk-apply hands-free

---

## Tech Stack

**Extension** — React 19, TypeScript, Tailwind CSS 4, Vite 7, Chrome Manifest V3, Zustand

**Backend** — Express 5, TypeScript, MongoDB (Mongoose), OpenAI, Coresignal API

**Automation** — Chrome Content Scripts, Shadow DOM traversal, MutationObserver, LinkedIn Voyager API

---

## Project Structure

```
linkedin-job-automator/
├── job-search-extension/       # Chrome extension (React + TypeScript)
│   ├── src/
│   │   ├── popup/              # Extension UI (App.tsx)
│   │   ├── content/            # Content scripts injected into LinkedIn
│   │   │   └── easyApply/      # Auto-apply controller + DOM selectors
│   │   └── background/         # Service worker, message routing
│   ├── public/                 # Extension icons
│   └── manifest.json           # Chrome MV3 config
│
├── job-search-backend/         # API server (Express + TypeScript)
│   └── src/
│       └── server.ts           # Routes, salary enrichment, profile, questions
│
├── LICENSE                     # MIT
└── README.md                   # You are here
```

---

## Contributing

This is an active project and contributions are welcome — from first-time PRs to architecture-level changes.

### Areas Where Help Is Needed

| Area | What's Involved | Good For |
|------|----------------|----------|
| **JD-Resume Matching** | NLP/embeddings to score job fit, filter dealbreakers | AI/ML engineers |
| **Cover Letter Generator** | GPT integration, template system, PDF export | Backend + AI |
| **InMail Automation** | LinkedIn messaging API, personalization, follow-up sequences | Full-stack |
| **Cold Outreach Pipeline** | PDL/Hunter/Apollo integration, email/SMS sending via Brevo | Backend + APIs |
| **Resume Tailoring** | Per-job resume edits, PDF generation, skill emphasis | AI + PDF |
| **Analytics Dashboard** | Track apply > response > interview conversion | Frontend |
| **UI/UX Overhaul** | Better design system, mobile-friendly popup, dark mode | Frontend + Design |
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
- Improve answer bank fuzzy matching

### Next
- JD-resume fit scoring with auto-filter
- Company data enrichment (CEO, CTO, HR contacts via PDL + Hunter)
- AI cover letter generation — personalized per job, not template garbage
- LinkedIn InMail drafting with smart follow-up sequences
- Cold email/text outreach from the extension via Brevo

### Later
- Personalized resume generation per application
- Application analytics (what's converting, what's not)
- Chrome Web Store release
- Multi-platform support (Indeed, Glassdoor)

---

## License

MIT — use it, fork it, build on it.

---

**Built out of frustration with the job search grind. If you feel the same, jump in.**
