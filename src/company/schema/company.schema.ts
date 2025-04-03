import { HydratedDocument, Schema, Types } from 'mongoose';

export const CompanySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
    },
    logo: {
      type: String, // Cloudinary URL
      default: '',
    },
    coverImage: {
      type: String, // Cloudinary URL
      default: '',
    },
    website: {
      type: String,
      trim: true,
    },
    industry: {
      type: String,
      required: true,
    },
    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
    },
    founded: {
      type: Number,
    },
    headquarters: {
      country: String,
      city: String,
      address: String,
    },
    socialLinks: {
      linkedin: String,
      twitter: String,
      facebook: String,
      instagram: String,
    },
    admins: [
      {
        user: {
          type: Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['owner', 'admin', 'recruiter'],
          default: 'recruiter',
        },
        permissions: [
          {
            type: String,
            enum: [
              'post_jobs',
              'edit_company',
              'manage_applications',
              'manage_admins',
            ],
          },
        ],
      },
    ],
    verificationStatus: {
      isVerified: {
        type: Boolean,
        default: false,
      },
      documents: [
        {
          type: String, // Cloudinary URLs for verification documents
        },
      ],
    },
    metrics: {
      totalJobs: {
        type: Number,
        default: 0,
      },
      activeJobs: {
        type: Number,
        default: 0,
      },
      totalApplications: {
        type: Number,
        default: 0,
      },
      averageResponseTime: {
        type: Number, // in hours
        default: 0,
      },
    },
    benefits: [
      {
        title: String,
        description: String,
        icon: String, // Could be an icon identifier or URL
      },
    ],
    culture: {
      values: [String],
      photos: [String], // Cloudinary URLs
      videos: [String], // URLs to company culture videos
    },
  },
  { timestamps: true },
);

export interface Company {
  name: string;
  slug: string;
  description: string;
  logo?: string;
  coverImage?: string;
  website?: string;
  industry: string;
  size?: string;
  founded?: number;
  headquarters?: {
    country: string;
    city: string;
    address: string;
  };
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  admins: {
    user: Types.ObjectId;
    role: 'owner' | 'admin' | 'recruiter';
    permissions: Array<
      'post_jobs' | 'edit_company' | 'manage_applications' | 'manage_admins'
    >;
  }[];
  verificationStatus: {
    isVerified: boolean;
    documents?: string[];
  };
  metrics: {
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
    averageResponseTime: number;
  };
  benefits?: {
    title: string;
    description: string;
    icon?: string;
  }[];
  culture?: {
    values: string[];
    photos: string[];
    videos: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export type CompanyDocument = HydratedDocument<Company>;
