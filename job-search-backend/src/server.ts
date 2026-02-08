import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import multer from 'multer';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

import { UserProfile } from './models/UserProfile';
import { QuestionAnswer } from './models/QuestionAnswer';
import { hashQuestion, normalizeQuestion } from './utils/questionNormalizer';
import { generateAIAnswer, parseResumeWithAI } from './services/aiAnswerService';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI!, {
  dbName: process.env.MONGO_DB_NAME,
}).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

// Multer for file uploads (memory storage for PDF parsing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

const app = express();
const PORT = process.env.PORT || 3001;

// API Configuration
const CORESIGNAL_API_KEY = process.env.CORESIGNAL_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Middleware - Allow all origins including Chrome extensions
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// In-memory cache for salary data (30 day TTL)
const salaryCache = new Map<string, { salary: any; timestamp: number }>();
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
}

interface SalaryData {
  min: number;
  max: number;
  confidence: number;
}

// Helper: Get cached salary or return null
function getCachedSalary(key: string): SalaryData | null {
  const cached = salaryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.salary;
  }
  return null;
}

// Helper: Set salary cache
function setSalaryCache(key: string, salary: SalaryData): void {
  salaryCache.set(key, { salary, timestamp: Date.now() });
}

// 1. Coresignal - Job Salary Data (Primary Source)
async function getCoresignalSalary(title: string, company: string, location: string): Promise<SalaryData | null> {
  if (!CORESIGNAL_API_KEY) {
    console.log('⚠️  Coresignal API key not configured');
    return null;
  }

  try {
    console.log(`🔍 Coresignal: Searching salary for "${title}" at "${company}" in "${location}"`);

    // Coresignal Multi-source Jobs API v2 with Elasticsearch DSL
    // Use query parameters for pagination (items_per_page), not body parameters
    const response = await fetch('https://api.coresignal.com/cdapi/v2/job_multi_source/search/es_dsl?items_per_page=10', {
      method: 'POST',
      headers: {
        'apikey': CORESIGNAL_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify({
        query: {
          bool: {
            must: [
              {
                match: {
                  title: {
                    query: title,
                    operator: 'or',  // Changed from 'and' to be more flexible
                    boost: 2.0        // Prioritize title matches
                  }
                }
              }
            ],
            should: [
              {
                match: {
                  company_name: {
                    query: company,
                    boost: 1.5        // Company match adds to score but not required
                  }
                }
              },
              {
                match: {
                  location: {
                    query: location,
                    boost: 1.0        // Location match adds to score but not required
                  }
                }
              }
            ],
            minimum_should_match: 0  // At least match title (required) + optionally company/location
            // Note: salary filter removed because field exists but is usually empty array []
          }
        },
        sort: ['_score']
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`⚠️  Coresignal API returned ${response.status}: ${errorText}`);
      return null;
    }

    const data = await response.json() as any;

    // Parse Coresignal Multi-source API response
    // Response structure: { hits: { hits: [ { _source: { salary: [...] } } ] } }
    if (data?.hits?.hits && Array.isArray(data.hits.hits) && data.hits.hits.length > 0) {
      console.log(`📊 Coresignal: Found ${data.hits.hits.length} matching jobs with salary data`);

      // Extract and normalize salary data
      const salaries: { min: number; max: number }[] = [];

      for (const hit of data.hits.hits) {
        const job = hit._source;

        // Salary is an array in v2 API - check it's not empty
        // Most jobs have salary: [] (empty array) even though field exists
        if (Array.isArray(job.salary) && job.salary.length > 0) {
          for (const salaryObj of job.salary) {
            if (salaryObj.min_value && salaryObj.max_value && salaryObj.currency === 'USD') {
              let min = salaryObj.min_value;
              let max = salaryObj.max_value;

              // Convert to annual salary based on type
              const type = salaryObj.type?.toUpperCase();
              if (type === 'HOUR') {
                min = min * 40 * 52; // 40 hours/week * 52 weeks/year
                max = max * 40 * 52;
              } else if (type === 'MONTH') {
                min = min * 12;
                max = max * 12;
              } else if (type === 'WEEK') {
                min = min * 52;
                max = max * 52;
              } else if (type === 'DAY') {
                min = min * 260; // ~260 working days/year
                max = max * 260;
              }
              // type === 'YEAR' or undefined - already annual

              salaries.push({ min, max });
            }
          }
        }
      }

      if (salaries.length > 0) {
        // Calculate average and apply statistical filtering to remove outliers
        const avgMin = Math.round(salaries.reduce((sum, s) => sum + s.min, 0) / salaries.length);
        const avgMax = Math.round(salaries.reduce((sum, s) => sum + s.max, 0) / salaries.length);

        console.log(`✅ Coresignal: Averaged ${salaries.length} salary ranges → $${(avgMin/1000).toFixed(0)}k-$${(avgMax/1000).toFixed(0)}k`);

        return {
          min: avgMin,
          max: avgMax,
          confidence: 0.90 // Very high confidence from real job postings across multiple sources
        };
      }
    }

    console.log('⚠️  Coresignal: No salary data found in results');
    return null;
  } catch (error: any) {
    console.error('❌ Coresignal API error:', error.message);
    return null;
  }
}

// 2. OpenAI - Intelligent Market Estimation
async function getOpenAISalary(title: string, company: string, location: string): Promise<SalaryData | null> {
  if (!OPENAI_API_KEY) {
    console.log('⚠️  OpenAI API key not configured');
    return null;
  }

  try {
    console.log(`🔍 OpenAI: Estimating salary for ${title} at ${company} in ${location}`);

    const prompt = `Based on current 2026 market data, estimate the annual salary range in USD for this role:

Job Title: ${title}
Company: ${company}
Location: ${location}

Consider:
- Current market rates for this role and seniority level
- Location cost of living and market conditions
- Company size and industry (if known)
- Recent salary trends in tech industry

Respond with ONLY a JSON object in this exact format (no markdown, no explanation):
{"min": <number>, "max": <number>, "reasoning": "<brief explanation>"}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a salary data expert with deep knowledge of global tech job markets.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      console.log(`⚠️  OpenAI API returned ${response.status}`);
      return null;
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content?.trim();

    if (content) {
      const salaryData = JSON.parse(content);
      console.log(`✅ OpenAI: Estimated $${salaryData.min}-$${salaryData.max} (${salaryData.reasoning})`);

      return {
        min: salaryData.min,
        max: salaryData.max,
        confidence: 0.80 // Good confidence from AI estimation
      };
    }

    console.log('⚠️  OpenAI: No valid response');
    return null;
  } catch (error: any) {
    console.error('❌ OpenAI API error:', error.message);
    return null;
  }
}

// 3. Algorithm-based Estimation (Final Fallback)
function estimateSalary(title: string, location: string): SalaryData {
  const titleLower = title.toLowerCase();

  // Base salaries by role
  let baseMin = 80000;
  let baseMax = 120000;

  if (titleLower.includes('senior') || titleLower.includes('sr.')) {
    baseMin = 120000;
    baseMax = 180000;
  } else if (titleLower.includes('lead') || titleLower.includes('principal') || titleLower.includes('staff')) {
    baseMin = 150000;
    baseMax = 220000;
  } else if (titleLower.includes('junior') || titleLower.includes('jr.') || titleLower.includes('entry')) {
    baseMin = 60000;
    baseMax = 90000;
  }

  // Adjust for role type
  if (titleLower.includes('ai') || titleLower.includes('ml') || titleLower.includes('machine learning')) {
    baseMin += 20000;
    baseMax += 30000;
  }

  if (titleLower.includes('engineer') || titleLower.includes('developer')) {
    // Already at base
  } else if (titleLower.includes('manager')) {
    baseMin += 30000;
    baseMax += 50000;
  } else if (titleLower.includes('director')) {
    baseMin += 60000;
    baseMax += 100000;
  }

  // Location multipliers - Account for international markets
  const locationLower = location.toLowerCase();
  let multiplier = 1.0;

  // India (₹1 = ~$0.012, with PPP adjustment ~0.35-0.4x of US salaries)
  if (locationLower.includes('india') || locationLower.includes('gurgaon') || locationLower.includes('gurugram') ||
      locationLower.includes('bangalore') || locationLower.includes('bengaluru') ||
      locationLower.includes('hyderabad') || locationLower.includes('pune') ||
      locationLower.includes('mumbai') || locationLower.includes('delhi') || locationLower.includes('ncr') ||
      locationLower.includes('noida') || locationLower.includes('chennai') || locationLower.includes('kolkata')) {

    // Higher pay in Bangalore/Gurgaon tech hubs
    if (locationLower.includes('bangalore') || locationLower.includes('bengaluru') ||
        locationLower.includes('gurgaon') || locationLower.includes('gurugram')) {
      multiplier = 0.4;
    } else {
      multiplier = 0.35;
    }
  }
  // Eastern Europe
  else if (locationLower.includes('poland') || locationLower.includes('ukraine') ||
           locationLower.includes('romania') || locationLower.includes('czech')) {
    multiplier = 0.5;
  }
  // Latin America
  else if (locationLower.includes('mexico') || locationLower.includes('brazil') ||
           locationLower.includes('argentina') || locationLower.includes('colombia')) {
    multiplier = 0.45;
  }
  // Southeast Asia
  else if (locationLower.includes('vietnam') || locationLower.includes('philippines') ||
           locationLower.includes('indonesia') || locationLower.includes('thailand')) {
    multiplier = 0.35;
  }
  // China
  else if (locationLower.includes('china') || locationLower.includes('beijing') ||
           locationLower.includes('shanghai') || locationLower.includes('shenzhen')) {
    multiplier = 0.6;
  }
  // US - High cost cities
  else if (locationLower.includes('san francisco') || locationLower.includes('sf') ||
           locationLower.includes('bay area') || locationLower.includes('palo alto') ||
           locationLower.includes('mountain view') || locationLower.includes('silicon valley')) {
    multiplier = 1.3;
  } else if (locationLower.includes('new york') || locationLower.includes('nyc') ||
             locationLower.includes('manhattan')) {
    multiplier = 1.25;
  } else if (locationLower.includes('seattle') || locationLower.includes('austin') ||
             locationLower.includes('boston') || locationLower.includes('los angeles')) {
    multiplier = 1.15;
  }
  // Europe - Western
  else if (locationLower.includes('london') || locationLower.includes('uk')) {
    multiplier = 1.1;
  } else if (locationLower.includes('germany') || locationLower.includes('netherlands') ||
             locationLower.includes('switzerland') || locationLower.includes('sweden')) {
    multiplier = 0.95;
  }
  // Canada
  else if (locationLower.includes('canada') || locationLower.includes('toronto') ||
           locationLower.includes('vancouver')) {
    multiplier = 0.85;
  }
  // Australia
  else if (locationLower.includes('australia') || locationLower.includes('sydney') ||
           locationLower.includes('melbourne')) {
    multiplier = 0.9;
  }
  // Remote (assume US-based remote)
  else if (locationLower.includes('remote')) {
    multiplier = 1.0;
  }
  // Default for other US cities
  else {
    multiplier = 0.95;
  }

  return {
    min: Math.round(baseMin * multiplier),
    max: Math.round(baseMax * multiplier),
    confidence: 0.75 // Estimated confidence
  };
}

// Helper: Process jobs in batches to avoid rate limiting
async function processBatch<T>(items: T[], batchSize: number, processor: (item: T) => Promise<any>, delayMs: number = 1000): Promise<any[]> {
  const results: any[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);

    // Wait between batches (except for the last batch)
    if (i + batchSize < items.length) {
      console.log(`⏳ Waiting ${delayMs}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

// API: Enrich jobs with salary data
app.post('/api/enrich-salary', async (req: Request, res: Response) => {
  console.log('📥 Received enrichment request from:', req.headers.origin || 'unknown origin');

  try {
    const { jobs } = req.body as { jobs: Job[] };
    console.log('📋 Processing', jobs?.length || 0, 'jobs for enrichment');

    if (!Array.isArray(jobs)) {
      return res.status(400).json({ error: 'Jobs array is required' });
    }

    // Process jobs in batches of 5 with 2-second delay to avoid rate limits
    const enrichedJobs = await processBatch(
      jobs,
      5, // Batch size
      async (job) => {
        const cacheKey = `${job.title}:${job.company}:${job.location}`;

        // Try cache first
        let salaryData = getCachedSalary(cacheKey);

        if (!salaryData) {
          console.log(`\n💼 Enriching: ${job.title} at ${job.company}, ${job.location}`);

          // Waterfall: Try each source in order until we get data

          // 1. Try Coresignal Multi-source Jobs API (real job postings - highest accuracy)
          salaryData = await getCoresignalSalary(job.title, job.company, job.location);

          // 2. Try OpenAI (intelligent AI-powered estimation)
          if (!salaryData) {
            salaryData = await getOpenAISalary(job.title, job.company, job.location);
          }

          // 3. Final fallback: Algorithm-based estimation
          if (!salaryData) {
            console.log('📊 Using fallback estimation algorithm');
            salaryData = estimateSalary(job.title, job.location);
          }

          // Cache the result
          setSalaryCache(cacheKey, salaryData);

          console.log(`✅ Final salary: $${(salaryData.min/1000).toFixed(0)}k-$${(salaryData.max/1000).toFixed(0)}k (confidence: ${(salaryData.confidence * 100).toFixed(0)}%)\n`);
        } else {
          console.log(`💾 Cache hit: ${job.title} at ${job.company}`);
        }

        return {
          id: job.id,
          salary: salaryData
        };
      },
      2000 // 2 second delay between batches
    );

    res.json({ jobs: enrichedJobs });
  } catch (error) {
    console.error('Enrichment error:', error);
    res.status(500).json({ error: 'Failed to enrich jobs' });
  }
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', cache_size: salaryCache.size });
});

// ============================================
// AUTO-APPLY FEATURE ENDPOINTS
// ============================================

// Get or create user profile
app.post('/api/profile', async (req: Request, res: Response) => {
  try {
    const {
      visitorId,
      email,
      phoneCountryCode,
      phoneNumber,
      city,
      state,
      country,
      workAuthorization,
      startDate,
      linkedInUrl,
      portfolioUrl,
    } = req.body;

    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId is required' });
    }

    let profile = await UserProfile.findOne({ visitorId });

    if (profile) {
      // Update existing profile - only update fields that are provided
      if (email !== undefined) profile.email = email;
      if (phoneCountryCode !== undefined) profile.phoneCountryCode = phoneCountryCode;
      if (phoneNumber !== undefined) profile.phoneNumber = phoneNumber;
      if (city !== undefined) profile.city = city;
      if (state !== undefined) profile.state = state;
      if (country !== undefined) profile.country = country;
      if (workAuthorization !== undefined) profile.workAuthorization = workAuthorization;
      if (startDate !== undefined) profile.startDate = startDate;
      if (linkedInUrl !== undefined) profile.linkedInUrl = linkedInUrl;
      if (portfolioUrl !== undefined) profile.portfolioUrl = portfolioUrl;
      await profile.save();
    } else {
      // Create new profile
      profile = await UserProfile.create({
        visitorId,
        email: email || '',
        phoneCountryCode: phoneCountryCode || 'India (+91)',
        phoneNumber: phoneNumber || '',
        city: city || '',
        state: state || '',
        country: country || 'United States',
        workAuthorization: workAuthorization || 'Yes',
        startDate: startDate || 'Immediately',
        linkedInUrl: linkedInUrl || '',
        portfolioUrl: portfolioUrl || '',
      });
    }

    console.log(`👤 Profile saved for visitor: ${visitorId}`);
    res.json({ success: true, profile });
  } catch (error: any) {
    console.error('Profile error:', error.message);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// Get user profile
app.get('/api/profile/:visitorId', async (req: Request, res: Response) => {
  try {
    const { visitorId } = req.params;
    const profile = await UserProfile.findOne({ visitorId });

    if (!profile) {
      // Return success: false instead of 404 - profile not existing is normal for new users
      return res.json({ success: false, exists: false, message: 'Profile not found' });
    }

    res.json({ success: true, exists: true, profile });
  } catch (error: any) {
    console.error('Get profile error:', error.message);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Upload and parse resume PDF
app.post('/api/profile/resume', upload.single('resume'), async (req: Request, res: Response) => {
  try {
    const { visitorId } = req.body;

    console.log('📄 Resume upload request received');
    console.log('  visitorId:', visitorId);
    console.log('  file present:', !!req.file);
    if (req.file) {
      console.log('  file size:', req.file.size);
      console.log('  file mimetype:', req.file.mimetype);
      console.log('  file originalname:', req.file.originalname);
    }

    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Resume file is required' });
    }

    if (req.file.size === 0) {
      return res.status(400).json({ error: 'Resume file is empty' });
    }

    console.log(`📄 Parsing resume for visitor: ${visitorId}`);

    // Parse PDF using pdf-parse v1.x API (simpler)
    let rawText = '';
    try {
      const pdfData = await pdfParse(req.file.buffer);
      rawText = pdfData.text || '';
    } catch (pdfError: any) {
      console.error('PDF parsing error:', pdfError.message);
      // Fallback: use filename if parsing fails
      rawText = `Resume uploaded: ${req.file.originalname}`;
    }

    console.log(`📝 Extracted ${rawText.length} characters from PDF`);

    // Use AI to parse structured data
    const { skills, yearsExperience } = await parseResumeWithAI(rawText);

    console.log(`🎯 Parsed skills: ${skills.join(', ')}`);
    console.log(`📅 Years experience: ${yearsExperience}`);

    // Update or create profile with resume
    let profile = await UserProfile.findOne({ visitorId });

    if (!profile) {
      profile = new UserProfile({ visitorId });
    }

    profile.resume = {
      fileName: req.file.originalname,
      rawText,
      skills,
      yearsExperience,
      parsedAt: new Date(),
    };

    await profile.save();

    res.json({
      success: true,
      resume: {
        fileName: req.file.originalname,
        skills,
        yearsExperience,
        textLength: rawText.length,
      },
    });
  } catch (error: any) {
    console.error('Resume upload error:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: `Failed to parse resume: ${error.message}` });
  }
});

// Get all stored questions for a user
app.get('/api/questions/:visitorId', async (req: Request, res: Response) => {
  try {
    const { visitorId } = req.params;
    const questions = await QuestionAnswer.find({ visitorId }).sort({ lastUsedAt: -1 });

    res.json({ success: true, questions });
  } catch (error: any) {
    console.error('Get questions error:', error.message);
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

// Helper: Get answer from profile for common application fields
function getCommonFieldAnswer(
  question: string,
  profile: any,
  options?: string[]
): { answer: string; confidence: number } | null {
  if (!profile) return null;

  // Common question patterns and their profile field mappings
  const patterns: Array<{
    keywords: string[];
    field: string;
    getValue: (p: any) => string;
  }> = [
    {
      keywords: ['city', 'location', 'where are you located', 'current location'],
      field: 'city',
      getValue: (p) => p.city || '',
    },
    {
      keywords: ['state', 'province'],
      field: 'state',
      getValue: (p) => p.state || '',
    },
    {
      keywords: ['country'],
      field: 'country',
      getValue: (p) => p.country || 'United States',
    },
    {
      keywords: ['phone', 'mobile', 'contact number', 'telephone'],
      field: 'phoneNumber',
      getValue: (p) => p.phoneNumber || '',
    },
    {
      keywords: ['email', 'e-mail'],
      field: 'email',
      getValue: (p) => p.email || '',
    },
    {
      keywords: ['linkedin', 'linkedin profile', 'linkedin url'],
      field: 'linkedInUrl',
      getValue: (p) => p.linkedInUrl || '',
    },
    {
      keywords: ['portfolio', 'website', 'personal site'],
      field: 'portfolioUrl',
      getValue: (p) => p.portfolioUrl || '',
    },
    {
      keywords: ['authorized', 'work authorization', 'legally authorized', 'require sponsorship', 'visa'],
      field: 'workAuthorization',
      getValue: (p) => p.workAuthorization || 'Yes',
    },
    {
      keywords: ['start date', 'when can you start', 'availability', 'available to start'],
      field: 'startDate',
      getValue: (p) => p.startDate || 'Immediately',
    },
    {
      keywords: ['years of experience', 'how many years', 'experience with', 'years experience'],
      field: 'yearsExperience',
      getValue: (p) => p.resume?.yearsExperience?.toString() || '',
    },
  ];

  for (const pattern of patterns) {
    const matches = pattern.keywords.some(kw => question.includes(kw));
    if (matches) {
      const value = pattern.getValue(profile);
      if (value) {
        console.log(`📋 Matched profile field "${pattern.field}" for question: "${question.substring(0, 40)}..."`);

        // For select/radio questions, try to match the value to an option
        if (options && options.length > 0) {
          const matchedOption = options.find(opt =>
            opt.toLowerCase().includes(value.toLowerCase()) ||
            value.toLowerCase().includes(opt.toLowerCase())
          );
          if (matchedOption) {
            return { answer: matchedOption, confidence: 0.95 };
          }
        }

        return { answer: value, confidence: 0.95 };
      }
    }
  }

  return null;
}

// Lookup answer for a question (used during auto-apply)
app.post('/api/questions/lookup', async (req: Request, res: Response) => {
  try {
    const { visitorId, questionText, questionType, options } = req.body;

    if (!visitorId || !questionText) {
      return res.status(400).json({ error: 'visitorId and questionText are required' });
    }

    // Get user profile first - needed for common field lookups
    const profile = await UserProfile.findOne({ visitorId });

    // Check for common profile fields FIRST (high confidence answers)
    const normalizedQuestion = questionText.toLowerCase().trim();
    const commonFieldAnswer = getCommonFieldAnswer(normalizedQuestion, profile, options);

    if (commonFieldAnswer) {
      console.log(`📋 Found common field answer for: "${questionText.substring(0, 50)}..."`);
      return res.json({
        success: true,
        found: true,
        answer: commonFieldAnswer.answer,
        source: 'profile',
        confidence: commonFieldAnswer.confidence,
      });
    }

    const qHash = hashQuestion(questionText);

    // Look for existing stored answer
    const existing = await QuestionAnswer.findOne({
      visitorId,
      questionHash: qHash,
    });

    if (existing) {
      // Update usage tracking
      existing.timesUsed += 1;
      existing.lastUsedAt = new Date();
      await existing.save();

      console.log(`✅ Found stored answer for: "${questionText.substring(0, 50)}..."`);
      return res.json({
        success: true,
        found: true,
        answer: existing.answer,
        source: existing.answerSource,
      });
    }

    // No stored answer found - try AI
    console.log(`🤖 No stored answer, generating AI response for: "${questionText.substring(0, 50)}..."`);

    const previousAnswers = await QuestionAnswer.find({ visitorId }).limit(10);

    const aiResult = await generateAIAnswer(
      questionText,
      questionType || 'text',
      profile?.resume ? {
        rawText: profile.resume.rawText,
        skills: profile.resume.skills,
        yearsExperience: profile.resume.yearsExperience,
      } : null,
      previousAnswers
    );

    res.json({
      success: true,
      found: false,
      suggestedAnswer: aiResult.answer,
      confidence: aiResult.confidence,
      reasoning: aiResult.reasoning,
      source: 'ai',
    });
  } catch (error: any) {
    console.error('Question lookup error:', error.message);
    res.status(500).json({ error: 'Failed to lookup question' });
  }
});

// Save a new question-answer pair
app.post('/api/questions', async (req: Request, res: Response) => {
  try {
    const { visitorId, questionText, questionType, answer, answerSource } = req.body;

    if (!visitorId || !questionText || !answer) {
      return res.status(400).json({ error: 'visitorId, questionText, and answer are required' });
    }

    const qHash = hashQuestion(questionText);

    // Upsert - update if exists, create if not
    const result = await QuestionAnswer.findOneAndUpdate(
      { visitorId, questionHash: qHash },
      {
        $set: {
          questionText,
          questionType: questionType || 'text',
          answer,
          answerSource: answerSource || 'user',
          lastUsedAt: new Date(),
        },
        $inc: { timesUsed: 1 },
        $setOnInsert: {
          visitorId,
          questionHash: qHash,
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    console.log(`💾 Saved answer for: "${questionText.substring(0, 50)}..."`);
    res.json({ success: true, question: result });
  } catch (error: any) {
    console.error('Save question error:', error.message);
    res.status(500).json({ error: 'Failed to save question' });
  }
});

// Delete a stored question
app.delete('/api/questions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await QuestionAnswer.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete question error:', error.message);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// Generate AI answer for a question
app.post('/api/ai/answer', async (req: Request, res: Response) => {
  try {
    const { visitorId, questionText, questionType, options } = req.body;

    if (!questionText) {
      return res.status(400).json({ error: 'questionText is required' });
    }

    // Get user profile for context
    const profile = visitorId ? await UserProfile.findOne({ visitorId }) : null;
    const previousAnswers = visitorId
      ? await QuestionAnswer.find({ visitorId }).limit(10)
      : [];

    const result = await generateAIAnswer(
      questionText,
      questionType || 'text',
      profile?.resume ? {
        rawText: profile.resume.rawText,
        skills: profile.resume.skills,
        yearsExperience: profile.resume.yearsExperience,
      } : null,
      previousAnswers,
      options
    );

    res.json({
      success: true,
      answer: result.answer,
      confidence: result.confidence,
      reasoning: result.reasoning,
    });
  } catch (error: any) {
    console.error('AI answer error:', error.message);
    res.status(500).json({ error: 'Failed to generate answer' });
  }
});

// Bulk lookup for multiple questions (used during auto-apply)
app.post('/api/questions/bulk-lookup', async (req: Request, res: Response) => {
  try {
    const { visitorId, questions } = req.body;

    if (!visitorId || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'visitorId and questions array are required' });
    }

    const profile = await UserProfile.findOne({ visitorId });
    const previousAnswers = await QuestionAnswer.find({ visitorId }).limit(20);

    const results: Record<string, { answer: string; source: string; confidence: number }> = {};

    for (const q of questions) {
      const qHash = hashQuestion(q.text);

      // Check for stored answer
      const existing = await QuestionAnswer.findOne({ visitorId, questionHash: qHash });

      if (existing) {
        results[q.text] = {
          answer: existing.answer,
          source: 'stored',
          confidence: 1.0,
        };
        // Update usage
        existing.timesUsed += 1;
        existing.lastUsedAt = new Date();
        await existing.save();
      } else {
        // Generate AI answer
        const aiResult = await generateAIAnswer(
          q.text,
          q.type || 'text',
          profile?.resume ? {
            rawText: profile.resume.rawText,
            skills: profile.resume.skills,
            yearsExperience: profile.resume.yearsExperience,
          } : null,
          previousAnswers,
          q.options
        );

        results[q.text] = {
          answer: aiResult.answer,
          source: 'ai',
          confidence: aiResult.confidence,
        };
      }
    }

    res.json({ success: true, answers: results });
  } catch (error: any) {
    console.error('Bulk lookup error:', error.message);
    res.status(500).json({ error: 'Failed to lookup questions' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Job Search Backend running on http://localhost:${PORT}`);
  console.log(`📊 Salary enrichment endpoint: POST /api/enrich-salary`);
  console.log(`💾 Cache TTL: ${CACHE_TTL / (24 * 60 * 60 * 1000)} days`);
});
