import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestionAnswer extends Document {
  visitorId: string;

  // Question identification
  questionHash: string;
  questionText: string;
  questionType: 'text' | 'select' | 'radio' | 'checkbox' | 'number';

  // Answer
  answer: string;
  answerSource: 'user' | 'ai';

  // Tracking
  timesUsed: number;
  lastUsedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const QuestionAnswerSchema = new Schema<IQuestionAnswer>(
  {
    visitorId: {
      type: String,
      required: true,
      index: true,
    },
    questionHash: {
      type: String,
      required: true,
      index: true,
    },
    questionText: {
      type: String,
      required: true,
    },
    questionType: {
      type: String,
      enum: ['text', 'select', 'radio', 'checkbox', 'number'],
      default: 'text',
    },
    answer: {
      type: String,
      required: true,
    },
    answerSource: {
      type: String,
      enum: ['user', 'ai'],
      default: 'user',
    },
    timesUsed: {
      type: Number,
      default: 1,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient lookups
QuestionAnswerSchema.index({ visitorId: 1, questionHash: 1 }, { unique: true });

export const QuestionAnswer = mongoose.model<IQuestionAnswer>('QuestionAnswer', QuestionAnswerSchema);
