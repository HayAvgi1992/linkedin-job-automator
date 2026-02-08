import mongoose, { Schema, Document } from 'mongoose';

export interface IUserProfile extends Document {
  visitorId: string;

  // Contact info
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;

  // Location info (for job applications)
  city: string;
  state: string;
  country: string;

  // Common application fields
  linkedInUrl: string;
  portfolioUrl: string;
  workAuthorization: string; // e.g., "Yes", "No", "Sponsorship Required"
  startDate: string; // e.g., "Immediately", "2 weeks", "1 month"

  // Resume data
  resume?: {
    fileName: string;
    rawText: string;
    skills: string[];
    yearsExperience: number;
    parsedAt: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

const UserProfileSchema = new Schema<IUserProfile>(
  {
    visitorId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      default: '',
    },
    phoneCountryCode: {
      type: String,
      default: 'India (+91)',
    },
    phoneNumber: {
      type: String,
      default: '',
    },
    // Location fields
    city: {
      type: String,
      default: '',
    },
    state: {
      type: String,
      default: '',
    },
    country: {
      type: String,
      default: 'United States',
    },
    // Common application fields
    linkedInUrl: {
      type: String,
      default: '',
    },
    portfolioUrl: {
      type: String,
      default: '',
    },
    workAuthorization: {
      type: String,
      default: 'Yes', // Authorized to work
    },
    startDate: {
      type: String,
      default: 'Immediately',
    },
    resume: {
      fileName: String,
      rawText: String,
      skills: [String],
      yearsExperience: Number,
      parsedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const UserProfile = mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);
