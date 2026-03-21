import 'dotenv/config'; // MUST be first — loads .env before any module reads process.env
import express, { Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import { salaryRoutes, salaryCache } from './routes/salary';
import { profileRoutes } from './routes/profile';
import { questionRoutes } from './routes/questions';
import { aiRoutes } from './routes/ai';
import { rankingRoutes } from './routes/ranking';

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI!, {
  dbName: process.env.MONGO_DB_NAME,
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - Allow all origins including Chrome extensions
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Mount route modules
app.use('/api', salaryRoutes);
app.use('/api', profileRoutes);
app.use('/api', questionRoutes);
app.use('/api', aiRoutes);
app.use('/api', rankingRoutes);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', cache_size: salaryCache.size });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Job Search Backend running on http://localhost:${PORT}`);
  console.log(`📊 Salary enrichment endpoint: POST /api/enrich-salary`);
  console.log(`💾 Cache TTL: ${30} days`);

  // Validate API keys
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY not set — salary enrichment will skip OpenAI and fall back to algorithm');
  }
  if (!process.env.CORESIGNAL_TOKEN) {
    console.warn('⚠️  CORESIGNAL_TOKEN not set — salary enrichment will skip Coresignal market data');
  }
  if (!process.env.MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI not set — profile and answer bank features will not work');
  }
});
