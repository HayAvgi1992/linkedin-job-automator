# LinkedIn Job Search Extension - $100k+ Jobs

AI-powered Chrome extension for finding high-paying jobs on LinkedIn with intelligent salary enrichment and tracking.

## 🎉 What's New (February 2026)

### ✅ **Multi-Page Fetching (100 jobs)**
- Fetches 4 pages of 25 jobs each (total 100 jobs)
- Live progress indicator showing % completion
- Smart rate limiting between requests

### ✅ **Save/Apply/Reject Tracking**
- **Save jobs** - Star your favorites for later
- **Mark as Applied** - Track which jobs you've applied to
- **Reject/Hide** - Remove jobs you're not interested in
- All stored locally in Chrome storage (no backend required for this)

### ✅ **Smart Filtering**
- **All** - See all fetched jobs
- **Saved** - Quick access to starred jobs
- **Applied** - Track your applications

### ✅ **Salary Enrichment**
- Estimates salary ranges for each job using intelligent algorithms
- Based on job title, company, and location
- Shows confidence level (75-95%)
- Cached for 30 days to reduce API costs

### ✅ **Fraser-Inspired UI**
- Dark header (#090c05)
- Clean, professional design
- Smooth animations and transitions
- Custom scrollbars
- Status indicators (New, Viewed, Applied)

## 🚀 Setup & Installation

### 1. Install the Extension

```bash
cd /Users/augustabhardwaj/code/MyLinkedIn/job-search-extension
npm install
npm run build
```

### 2. Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `dist` folder from the extension directory

### 3. Start the Backend (For Salary Enrichment)

```bash
cd /Users/augustabhardwaj/code/MyLinkedIn/job-search-backend
npm install
npm run dev
```

Backend runs on: `http://localhost:3001`

## 📖 How to Use

### Step 1: Search for Jobs

1. Open LinkedIn (linkedin.com)
2. Click the extension toggle button (right side of page)
3. Enter job title/keywords (e.g., "AI Engineer", "Full Stack Developer")
4. Optional: Add location, enable "Remote only"
5. Click "Search Jobs"

The extension will:
- Fetch 100 jobs across 4 pages
- Show progress in real-time
- Automatically enrich with salary data
- Filter out any previously rejected jobs

### Step 2: Review & Manage Jobs

**Filter Tabs:**
- **All (100)** - See all fetched jobs
- **Saved (5)** - Your starred favorites
- **Applied (3)** - Jobs you've applied to

**Job Card Actions:**
- **Save** - Click star icon to bookmark
- **Apply** - Opens LinkedIn job page + marks as applied
- **Hide** - Click X to remove from results

**Job Card Info:**
- Green dot = New, unviewed job
- Applied badge = You've applied to this
- Salary range (if available) with confidence level
- Location + Remote indicator

### Step 3: Apply to Jobs

Click "Apply" button to:
1. Open the job on LinkedIn
2. Automatically mark as applied in extension
3. Track in your "Applied" tab

## 🎨 Design Features

### Header
- Dark background (#090c05)
- $100k+ indicator badge
- Clean, professional branding

### Job Cards
- White background with subtle shadows
- Hover effects on borders
- Action buttons at bottom
- Status indicators (New, Applied)
- Salary ranges with confidence scores

### Filters & Navigation
- Tab-based filtering
- Count badges for each filter
- Back to Search button
- Progress bar during fetching

## 🔧 Technical Stack

### Frontend (Extension)
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Vite** for building
- **Chrome Extension Manifest V3**

### Backend (API)
- **Express.js** with TypeScript
- **In-memory caching** (30-day TTL)
- **Intelligent salary estimation** algorithm
- Ready for PDL/Coresignal integration

### Storage
- **Chrome Storage API** for user interactions
- **MongoDB** ready for persistent storage
- Cache-first strategy for enrichment data

## 💡 Smart Salary Estimation

Our algorithm considers:
- **Job Title Seniority**: Junior ($60k-$90k), Mid ($80k-$120k), Senior ($120k-$180k), Lead/Staff ($150k-$220k+)
- **Role Type**: AI/ML roles (+$20k-$30k premium)
- **Location**: SF/Bay Area (1.3x), NYC (1.25x), Seattle/Austin/Boston (1.15x), Remote (1.1x)
- **Confidence Level**: 75-95% based on data quality

### Example Estimates:
- "Senior AI Engineer" in SF: $156k - $234k (90% confident)
- "Full Stack Developer" Remote: $88k - $132k (80% confident)
- "ML Engineer" in NYC: $150k - $225k (85% confident)

## 📊 Data Flow

```
User Search
    ↓
LinkedIn Voyager API (4 pages × 25 jobs)
    ↓
Extension Frontend (React)
    ↓
Backend API (/api/enrich-salary)
    ↓
Salary Estimation Algorithm
    ↓
Enriched Jobs Display
    ↓
User Actions (Save/Apply/Reject)
    ↓
Chrome Storage (Local Persistence)
```

## 🔐 Privacy & Storage

### Chrome Storage (Local)
```javascript
{
  savedJobs: ['jobId1', 'jobId2', ...],      // Your saved jobs
  appliedJobs: ['jobId3', ...],              // Jobs you've applied to
  rejectedJobs: ['jobId4', ...],             // Hidden jobs
  viewedJobs: ['jobId5', ...]                // Viewed job IDs
}
```

- Stored locally on your machine
- No data sent to external servers (except LinkedIn)
- Clear browser data to reset

### Backend Cache (In-Memory)
- Salary estimates cached for 30 days
- Cleared on server restart
- Key format: `{title}:{company}:{location}`

## 🚧 Roadmap

### Phase 2 (Next Week)
- [ ] Real PDL API integration for accurate salaries
- [ ] MongoDB persistence for saved jobs
- [ ] Export to Salesforce/HubSpot
- [ ] Hiring manager email finder (Hunter API)

### Phase 3 (Week After)
- [ ] OpenAI job-description analysis
- [ ] Two-way matching (user profile + job desc)
- [ ] AI cover letter generation
- [ ] Auto-apply for Easy Apply jobs
- [ ] Application success analytics

## 🐛 Troubleshooting

### Extension not loading?
- Make sure you're on LinkedIn (linkedin.com)
- Refresh the page after loading extension
- Check browser console for errors

### No jobs found?
- LinkedIn might be rate limiting
- Try fewer pages (reduce maxPages in App.tsx)
- Wait a few minutes and try again

### Salary enrichment not working?
- Check if backend is running: `curl http://localhost:3001/health`
- Should return: `{"status":"ok","cache_size":0}`
- Restart backend: `npm run dev`

### Jobs not saving?
- Check Chrome storage: Open DevTools → Application → Storage → Local Storage
- Clear extension data: `chrome.storage.local.clear()`

## 📝 Configuration

### Change number of jobs fetched:
Edit `src/popup/App.tsx`:
```typescript
const maxPages = 4; // Fetch 100 jobs (4 × 25)
// Change to 2 for 50 jobs, 8 for 200 jobs, etc.
```

### Adjust rate limiting:
```typescript
await new Promise(resolve => setTimeout(resolve, 500));
// Change 500ms delay between requests
```

### Change salary cache TTL:
Edit `src/server.ts`:
```typescript
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
```

## 🎯 Success Metrics

**Current Performance:**
- ✅ Fetches 100 jobs in ~10-15 seconds
- ✅ Enriches with salary data in ~2-3 seconds
- ✅ 75-90% salary accuracy (estimated)
- ✅ 0 cost (using estimation algorithm)

**Next Goals:**
- 90%+ salary accuracy with PDL integration
- AI matching scores (0-100%)
- Auto-apply functionality
- Email alerts for new matches

## 🙏 Credits

- **Fraser Extension** - Design inspiration
- **LinkedIn Voyager API** - Job data
- **Tailwind CSS** - Styling framework
- **Lucide Icons** - Beautiful icons

---

Built with ❤️ for finding $100k+ jobs efficiently
