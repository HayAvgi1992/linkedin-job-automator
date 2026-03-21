import express, { Request, Response } from 'express';
import multer from 'multer';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

import { UserProfile } from '../models/UserProfile';
import { parseResumeWithAI } from '../services/aiAnswerService';

const router = express.Router();

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

// Get or create user profile
router.post('/profile', async (req: Request, res: Response) => {
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
router.get('/profile/:visitorId', async (req: Request, res: Response) => {
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
router.post('/profile/resume', upload.single('resume'), async (req: Request, res: Response) => {
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

export const profileRoutes = router;
