# LinkedIn Job Automator - Project Context

## Engineering Persona

When debugging or building features, adopt the mindset in `.claude/agents/engineering-backend-architect.md` and `.claude/agents/engineering-frontend-developer.md`. In short:

- **Trace, don't guess** — Read every file in a data flow chain before proposing fixes. Log what actually happens, not what should happen.
- **Chrome MV3 awareness** — Popup Zustand stores die on close (hydrate from chrome.storage every open). Service workers go inactive after 30s (don't hold long promises). `sendMessage` needs `return true` for async responses. Content scripts can double-inject on SPA nav.
- **Security-first** — Defense in depth, least privilege, encrypt at rest and in transit. No shortcuts.
- **Reliability-obsessed** — Graceful degradation, circuit breakers, explicit error handling in every branch. Never swallow errors.
- **Name trade-offs** — State what you gain AND what you lose with every architectural choice.
- **Zero console errors in production** — If it logs a warning, fix the root cause.

## Overview
Chrome MV3 extension + Express backend for LinkedIn job search automation.
Upload resume, search jobs, auto-apply to Easy Apply listings — end to end.

## Architecture

```
Extension Popup (React 19 + Zustand + Tailwind)
    ↕ chrome.runtime.sendMessage
Background Service Worker (message router + API proxy)
    ↕ chrome.tabs.sendMessage          ↕ fetch()
Content Script (LinkedIn page)     Express Backend (localhost:3001)
  - Voyager API calls                  - MongoDB Atlas
  - EasyApply form automation          - OpenAI GPT-4o-mini
  - Shadow DOM traversal               - Coresignal API
```

## Key Files

### Extension (`job-search-extension/`)

**State Management (Zustand)**
| File | Purpose |
|------|---------|
| `src/store/jobStore.ts` | Jobs + job statuses (single source of truth), chrome.storage persistence, migration from old format |
| `src/store/profileStore.ts` | Profile settings, resume info, visitorId |
| `src/store/autoApplyStore.ts` | Auto-apply status, messages, missing input, bulk progress |
| `src/store/questionStore.ts` | Saved Q&A from answer bank |

**Types & Constants**
| File | Purpose |
|------|---------|
| `src/types/index.ts` | All shared interfaces: Job, JobStatus, ProfileSettings, ResumeInfo, etc. |
| `src/constants/locations.ts` | LOCATIONS array for search dropdown |

**Hooks (Business Logic)**
| File | Purpose |
|------|---------|
| `src/hooks/useJobSearch.ts` | searchJobs, loadMoreJobs, enrichJobsWithSalary |
| `src/hooks/useAutoApply.ts` | startAutoApply, applyToJob, startBulkAutoApply, submitMissingInput |

**Components**
| File | Purpose |
|------|---------|
| `src/popup/App.tsx` | ~50 lines — hydration + view routing shell |
| `src/components/Header.tsx` | Header bar + navigation tabs |
| `src/components/SearchView.tsx` | Job search form |
| `src/components/JobListView.tsx` | Job list with filter tabs (Queue/Saved/Applied) |
| `src/components/JobCard.tsx` | Individual job card with actions |
| `src/components/AutoApplyView.tsx` | Container for auto-apply settings |
| `src/components/ResumeSection.tsx` | Resume upload/display |
| `src/components/ProfileSettings.tsx` | Profile form (city, phone, auth, etc.) |
| `src/components/BulkApplySection.tsx` | Bulk + single apply controls |
| `src/components/SavedAnswers.tsx` | Answer bank display |
| `src/components/MissingInputModal.tsx` | Modal for fields that can't be auto-filled |

**Content Script & Background**
| File | Purpose |
|------|---------|
| `src/content/index.ts` | Panel injection, Voyager API, message relay |
| `src/content/easyApply/EasyApplyController.ts` | Form automation: field detection, filling, multi-step nav |
| `src/content/easyApply/selectors.ts` | CSS selectors for LinkedIn DOM elements |
| `src/background/index.ts` | Service worker: routes messages, proxies backend API |

### Backend (`job-search-backend/`)
| File | Purpose |
|------|---------|
| `src/server.ts` | ~50 lines — Express setup, middleware, route mounting |
| `src/routes/salary.ts` | Salary enrichment pipeline (cache → Coresignal → OpenAI → algorithm) |
| `src/routes/profile.ts` | Profile CRUD + resume upload/parse |
| `src/routes/questions.ts` | Answer bank: CRUD, lookup, bulk-lookup, common field matching |
| `src/routes/ai.ts` | Direct AI answer generation |
| `src/models/UserProfile.ts` | Mongoose schema: profile + embedded resume |
| `src/models/QuestionAnswer.ts` | Mongoose schema: answer bank with question hash |
| `src/services/aiAnswerService.ts` | OpenAI integration for Q&A and resume parsing |
| `src/utils/questionNormalizer.ts` | Normalize + hash questions for dedup |

## Tech Stack
- **Frontend**: React 19, TypeScript, Zustand, Tailwind CSS, Vite, @crxjs/vite-plugin
- **Backend**: Express 5, Mongoose 9, TypeScript, Multer, pdf-parse
- **APIs**: LinkedIn Voyager (undocumented), OpenAI (gpt-4o-mini), Coresignal
- **Storage**: Chrome storage.local (jobs/statuses/settings), MongoDB Atlas (profiles/answers)
- **Build**: `npm run dev` (both dirs), extension loads as unpacked in Chrome

## Data Flow
1. **Job Search**: SearchView hook → Background → Content Script → LinkedIn Voyager API → jobStore.setJobs()
2. **Salary Enrichment**: useJobSearch hook → Background → Backend `/api/enrich-salary` → jobStore.updateJobsSalary()
3. **Auto Apply**: useAutoApply hook opens tab → Content Script → EasyApplyController fills form → answer lookup via Backend → submit
4. **Answer Bank**: Field encountered → Backend `/api/questions/lookup` → profile match / stored answer / AI generation → save for reuse
5. **Job Tracking**: All status in jobStore.jobStatuses (Record<jobId, JobStatus>) → persisted to chrome.storage.local (debounced)

## Conventions
- State lives in zustand stores, NOT component state (except local UI like form inputs)
- Job statuses: `queued | saved | applying | applied | failed | rejected` — single `jobStatuses` map
- Components access stores directly via hooks (no prop drilling for global state)
- Business logic lives in `src/hooks/`, not in components
- Backend routes use `express.Router()`, mounted under `/api` in server.ts
- No tests exist yet — add them as features stabilize
- visitorId is the sole user identifier — no auth system exists
- Backend runs on localhost:3001, CORS allows all origins

## Approval-First Workflow
- Before making any code or file changes, propose the intended fix first and wait for explicit user approval.
- Do not run write actions (edit/create/delete files, code formatting with write output, dependency installs that modify lockfiles) until the user approves.
- Do not run git write actions (`commit`, `merge`, `rebase`, `push`, remote changes) without explicit user approval.
- Read-only exploration (searching files, reading files, diagnostics) is allowed before approval.
- If the user says "go ahead" (or equivalent), proceed with the approved change scope only; if scope changes, ask again.

## Remaining Issues (prioritized)
1. **Answer bank matching too rigid** — exact hash match misses semantically similar questions
2. **No auth on backend** — any visitorId can access any user's data
3. **EasyApply selectors break on LinkedIn updates** — hardcoded CSS classes
4. **CORS allows all origins** — should whitelist extension origin only
5. **No input validation on backend** — emails, phones, URLs not validated

## Commands
```bash
# Extension
cd job-search-extension && npm run dev    # Vite dev build + watch
cd job-search-extension && npm run build  # Production build

# Backend
cd job-search-backend && npm run dev      # nodemon + ts-node
cd job-search-backend && npm run build    # tsc → dist/
```
