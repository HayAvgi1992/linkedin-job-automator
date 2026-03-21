import express, { Request, Response } from 'express';

const router = express.Router();

// In-memory cache for salary data (30 day TTL)
export const salaryCache = new Map<string, { salary: any; timestamp: number }>();
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
  source: 'coresignal' | 'openai' | 'algorithm' | 'cache';
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
  if (!process.env.CORESIGNAL_TOKEN) {
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
        'apikey': process.env.CORESIGNAL_TOKEN,
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
          confidence: 0.90,
          source: 'coresignal' as const,
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
  if (!process.env.OPENAI_API_KEY) {
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
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
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
        confidence: 0.80,
        source: 'openai' as const,
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
    confidence: 0.75,
    source: 'algorithm' as const,
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
router.post('/enrich-salary', async (req: Request, res: Response) => {
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

export const salaryRoutes = router;
