import { HydratedDocument, Schema, Types } from 'mongoose';

export const JobSchema = new Schema(
  {
    employer: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: [3, 'Job title must be at least 3 characters long'],
      maxlength: [100, 'Job title cannot exceed 100 characters'],
    },
    subtitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Subtitle cannot exceed 200 characters'],
    },
    poster: {
      type: String, // Cloudinary URL
      default: '',
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'draft', 'expired'],
      default: 'open',
    },
    company: {
      type: Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    jobType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'freelance', 'internship'],
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'programming',
        'design',
        'marketing',
        'sales',
        'customer-service',
        'general-labor',
        'administrative',
        'other',
      ],
    },
    requirements: {
      type: [String],
      required: true,
      validate: {
        validator: function (v: string[]) {
          return (
            Array.isArray(v) &&
            v.length > 0 &&
            v.every((item) => item.trim().length > 0)
          );
        },
        message: 'At least one non-empty requirement is needed',
      },
    },
    technicalRequirements: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      required: true,
      minlength: [50, 'Description must be at least 50 characters long'],
    },
    salary: {
      range: {
        min: { type: Number },
        max: { type: Number },
      },
      currency: {
        type: String,
        enum: ['USD', 'EUR', 'GBP', 'FCFA', 'NGN', 'GHC'],
        default: 'USD',
      },
      period: {
        type: String,
        enum: ['hourly', 'monthly', 'yearly'],
        default: 'yearly',
      },
      isNegotiable: {
        type: Boolean,
        default: true,
      },
    },
    location: {
      type: {
        type: String,
        enum: ['remote', 'on-site', 'hybrid'],
        required: true,
      },
      country: { type: String, default: '' },
      city: { type: String, default: '' },
      address: { type: String, default: '' },
    },
    applicationDeadline: {
      type: Date,
      required: true,
      validate: {
        validator: function (v: Date) {
          return v > new Date();
        },
        message: 'Application deadline must be in the future',
      },
    },
    experienceLevel: {
      type: String,
      enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'any'],
      required: true,
    },
    benefits: {
      type: [String],
      default: [],
    },
    applicationCount: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPromoted: {
      type: Boolean,
      default: false,
    },
    applicationsEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Add salary range validation using middleware
JobSchema.pre('save', function (next) {
  if (this.salary?.range?.min != null && this.salary?.range?.max != null) {
    if (this.salary.range.max < this.salary.range.min) {
      next(
        new Error(
          'Maximum salary must be greater than or equal to minimum salary',
        ),
      );
      return;
    }
  }
  next();
});

// Add indexes
JobSchema.index({ title: 'text', description: 'text' });
JobSchema.index({ status: 1, applicationDeadline: 1 });
JobSchema.index({ employer: 1 });

export interface Job {
  _id?: string;
  employer: Types.ObjectId;
  title: string;
  subtitle: string;
  poster?: string;
  status: 'open' | 'closed' | 'draft' | 'expired';
  company: Types.ObjectId;
  jobType: 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';
  category: string;
  requirements: string[];
  technicalRequirements: string[];
  description: string;
  salary?: {
    range: {
      min?: number;
      max?: number;
    };
    currency: 'USD' | 'EUR' | 'GBP' | 'FCFA';
    period: 'hourly' | 'monthly' | 'yearly';
    isNegotiable: boolean;
  };
  location: {
    type: 'remote' | 'on-site' | 'hybrid';
    country?: string;
    city?: string;
    address?: string;
  };
  applicationDeadline: Date;
  experienceLevel: 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'any';
  benefits: string[];
  applicationCount: number;
  views: number;
  isPromoted: boolean;
  applicationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type JobDocument = HydratedDocument<Job>;
