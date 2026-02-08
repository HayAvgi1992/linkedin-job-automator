# Job Search Backend

Express + TypeScript API server powering the LinkedIn Job Automator extension.

## What It Does

- **Salary Enrichment** — 3-layer estimation: Coresignal API > GPT-4o-mini > algorithmic fallback, each with confidence scores
- **Profile Management** — Stores user profile, resume data, and preferences
- **Answer Bank** — Saves and retrieves application question/answer pairs for auto-fill
- **Resume Parsing** — PDF upload with skill extraction via OpenAI

## Tech Stack

- **Express 5** + TypeScript
- **MongoDB** (Mongoose) for persistence
- **OpenAI** for salary estimation and resume parsing
- **Coresignal** for job market salary data
- **Multer** for file uploads
- **dotenv** for config

## Setup

```bash
# Install dependencies
npm install

# Copy env template and fill in your keys
cp .env.example .env

# Run in development
npm run dev

# Build for production
npm run build && npm start
```

Server runs on `http://localhost:3001`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/enrich-salary` | Enrich jobs with salary estimates |
| POST | `/api/profile` | Save user profile |
| GET | `/api/profile/:visitorId` | Get user profile |
| POST | `/api/profile/resume` | Upload resume (PDF) |
| POST | `/api/questions` | Save a question/answer |
| GET | `/api/questions/:visitorId` | Get all saved answers |
| POST | `/api/questions/lookup` | Look up answer for a question |
| DELETE | `/api/questions/:questionId` | Delete a saved answer |
| GET | `/health` | Health check |

## Environment Variables

See `.env.example` for required variables. You'll need:
- MongoDB Atlas connection string
- OpenAI API key (for salary estimation + resume parsing)
- Coresignal token (for job market data)
- Optional: PDL, Apollo, Hunter, Brevo keys for upcoming features

## Contributing

See the root [README](../README.md) for contribution guidelines.
