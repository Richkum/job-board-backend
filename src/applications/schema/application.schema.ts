import { HydratedDocument, Schema, Types } from 'mongoose';

export const ApplicationSchema = new Schema(
  {
    job: {
      type: Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    applicant: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending',
    },
    coverLetter: {
      type: String,
      required: true,
      minlength: [100, 'Cover letter must be at least 100 characters long'],
    },
    resume: {
      type: String, // URL to resume (Cloudinary)
      required: true,
    },
    portfolio: {
      links: [
        {
          title: { type: String },
          url: { type: String },
          description: { type: String },
        },
      ],
    },
    relevantExperience: {
      type: [String],
      default: [],
    },
    expectedSalary: {
      amount: { type: Number },
      currency: { type: String, default: 'USD' },
      period: {
        type: String,
        enum: ['hourly', 'monthly', 'yearly'],
        default: 'yearly',
      },
    },
    additionalDocuments: [
      {
        title: { type: String },
        url: { type: String }, // Cloudinary URL
        type: { type: String },
      },
    ],
    notes: {
      type: String,
      default: '',
    },
    reviewNotes: {
      type: String, // For employer's internal notes
      default: '',
    },
    interviewDate: {
      type: Date,
      default: null,
    },
    withdrawalReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  },
);

// Ensure one application per job per user
ApplicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

export interface Application {
  job: Types.ObjectId;
  applicant: Types.ObjectId;
  status: 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn';
  coverLetter: string;
  resume: string;
  portfolio?: {
    links: {
      title: string;
      url: string;
      description?: string;
    }[];
  };
  relevantExperience: string[];
  expectedSalary?: {
    amount: number;
    currency: string;
    period: 'hourly' | 'monthly' | 'yearly';
  };
  additionalDocuments?: {
    title: string;
    url: string;
    type: string;
  }[];
  notes?: string;
  reviewNotes?: string;
  interviewDate?: Date | null;
  withdrawalReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ApplicationDocument = HydratedDocument<Application>;
