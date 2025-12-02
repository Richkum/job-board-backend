import { HydratedDocument, Schema, Types } from 'mongoose';

export const CrawledJobSchema = new Schema(
  {
    // === REQUIRED CORE FIELDS ===
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    company: {
      name: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },
      logo: {
        type: String,
        default: '',
      },
      website: {
        type: String,
        default: '',
      },
    },
    description: {
      type: String,
      required: true,
    },
    applyUrl: {
      type: String,
      required: true,
    },

    // === SOURCE TRACKING (Critical for avoiding duplicates) ===
    source: {
      platform: {
        type: String,
        required: true,
        enum: [
          'adzuna',
          'remoteok',
          'linkedin',
          'indeed',
          'github',
          'stackoverflow',
        ],
      },
      externalId: {
        type: String,
        required: true,
      },
      originalUrl: {
        type: String,
        default: '',
      },
      fetchedAt: {
        type: Date,
        default: Date.now,
      },
      lastVerified: {
        type: Date,
        default: Date.now,
      },
    },

    // === LOCATION INFORMATION ===
    location: {
      type: {
        type: String,
        enum: ['remote', 'on-site', 'hybrid'],
        default: 'on-site',
      },
      country: {
        type: String,
        default: '',
        index: true,
      },
      city: {
        type: String,
        default: '',
        index: true,
      },
      address: {
        type: String,
        default: '',
      },
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },

    // === COMPENSATION ===
    salary: {
      min: {
        type: Number,
        default: null,
      },
      max: {
        type: Number,
        default: null,
      },
      currency: {
        type: String,
        default: 'USD',
      },
      period: {
        type: String,
        enum: ['hourly', 'monthly', 'yearly'],
        default: 'yearly',
      },
      isDisclosed: {
        type: Boolean,
        default: false,
      },
    },

    // === JOB DETAILS ===
    jobType: {
      type: String,
      enum: [
        'full-time',
        'part-time',
        'contract',
        'freelance',
        'internship',
        'temporary',
      ],
    },

    category: {
      type: String,
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
      default: 'other',
    },

    requirements: {
      type: [String],
      default: [],
    },

    experienceLevel: {
      type: String,
      enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'any'],
      default: 'any',
    },

    // === DATES ===
    postedDate: {
      type: Date,
      default: Date.now,
    },
    expirationDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },

    // === STATUS & METADATA ===
    status: {
      type: String,
      enum: ['active', 'expired', 'removed', 'duplicate'],
      default: 'active',
    },

    views: {
      type: Number,
      default: 0,
    },

    clickThroughs: {
      type: Number,
      default: 0,
    },

    // === AI & PROCESSING FIELDS ===
    tags: {
      type: [String],
      default: [],
      index: true,
    },

    processingStatus: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'pending',
    },

    lastProcessed: {
      type: Date,
      default: null,
    },

    // === RAW DATA STORAGE ===
    rawData: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  },
);

// === COMPOUND INDEXES FOR PERFORMANCE ===
CrawledJobSchema.index(
  { 'source.platform': 1, 'source.externalId': 1 },
  { unique: true, name: 'unique_source_job' },
);

CrawledJobSchema.index(
  { title: 'text', description: 'text', 'company.name': 'text' },
  { name: 'job_search_text_index' },
);

CrawledJobSchema.index(
  { status: 1, expirationDate: 1 },
  { name: 'active_jobs_index' },
);

CrawledJobSchema.index(
  { 'location.country': 1, 'location.city': 1 },
  { name: 'location_index' },
);

CrawledJobSchema.index({ tags: 1, status: 1 }, { name: 'tags_status_index' });

// === INTERFACE (Following your pattern) ===
export interface CrawledJob {
  // Core Fields
  title: string;
  company: {
    name: string;
    logo?: string;
    website?: string;
  };
  description: string;
  applyUrl: string;

  // Source Tracking
  source: {
    platform:
      | 'adzuna'
      | 'remoteok'
      | 'linkedin'
      | 'indeed'
      | 'github'
      | 'stackoverflow';
    externalId: string;
    originalUrl?: string;
    fetchedAt: Date;
    lastVerified: Date;
  };

  // Location
  location: {
    type: 'remote' | 'on-site' | 'hybrid';
    country?: string;
    city?: string;
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  // Compensation
  salary: {
    min?: number;
    max?: number;
    currency: string;
    period: 'hourly' | 'monthly' | 'yearly';
    isDisclosed: boolean;
  };

  // Job Details
  jobType?:
    | 'full-time'
    | 'part-time'
    | 'contract'
    | 'freelance'
    | 'internship'
    | 'temporary';
  category:
    | 'programming'
    | 'design'
    | 'marketing'
    | 'sales'
    | 'customer-service'
    | 'general-labor'
    | 'administrative'
    | 'other';
  requirements: string[];
  experienceLevel: 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'any';

  // Dates
  postedDate: Date;
  expirationDate: Date;

  // Status & Metadata
  status: 'active' | 'expired' | 'removed' | 'duplicate';
  views: number;
  clickThroughs: number;

  // AI & Processing
  tags: string[];
  processingStatus: 'pending' | 'processed' | 'failed';
  lastProcessed?: Date;

  // Raw Data
  rawData: Record<string, any>;

  // Timestamps (from { timestamps: true })
  createdAt: Date;
  updatedAt: Date;
}

export type CrawledJobDocument = HydratedDocument<CrawledJob>;
