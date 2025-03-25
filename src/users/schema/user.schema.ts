import { HydratedDocument, Schema } from 'mongoose';

export const User = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true, // removes extra spaces
      match: [
        /^[a-zA-Z0-9 ]{3,30}$/,
        'Username must be 3-30 characters and contain letters, numbers, or spaces.',
      ],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true, // ensure email is stored in lowercase
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please enter a valid email address.'],
    },
    password: {
      type: String,
      required: true, // Store hashed password only
    },
    role: {
      type: String,
      enum: ['jobSeeker', 'employer', 'admin'],
      default: 'jobSeeker',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationCode: {
      type: String,
      default: '',
    },
    verificationCodeExpires: {
      type: Date,
      default: null,
    },
    sessions: [
      {
        token: { type: String, required: true }, // JWT or session ID
        device: {
          name: { type: String, required: true }, // e.g., "Chrome on Windows"
          os: { type: String, required: true }, // Operating system like "Windows 10", "iOS 16.5"
          browser: { type: String, required: true }, // Browser details, e.g., "Chrome 90"
          type: {
            type: String,
            enum: ['mobile', 'desktop', 'tablet', 'bot'],
            default: 'desktop',
          },
        },
        ipAddress: { type: String, required: true },
        location: {
          country: { type: String, default: '' },
          city: { type: String, default: '' },
          coordinates: {
            type: [Number], // [longitude, latitude]
            default: [],
            validate: {
              validator: (v: number[]) => v.length === 2,
              message: 'Coordinates must be [longitude, latitude]',
            },
          },
        },
        lastActivity: { type: Date, default: Date.now },
        isCurrent: { type: Boolean, default: true }, // Mark active sessions
      },
    ],
    googleId: { type: String, sparse: true },
    googleRefreshToken: { type: String },
    profilePicture: {
      type: String,
      default: '', // URL for profile picture
    },
    profile: {
      bio: { type: String, default: '' },
      technologies: { type: [String], default: [] },
      socials: {
        linkedin: { type: String, default: '' },
        twitter: { type: String, default: '' },
        github: { type: String, default: '' },
      },
      location: {
        country: { type: String, default: '' },
        city: { type: String, default: '' },
        coordinates: { type: [Number], default: [] },
      },
      companyDetails: {
        companyName: { type: String, default: '' },
        website: { type: String, default: '' },
        about: { type: String, default: '' },
        companyLogo: { type: String, default: '' },
      },
    },
  },
  { timestamps: true }, // Automatically creates createdAt and updatedAt fields
);

// TypeScript Interface
export interface User {
  username: string;
  email: string;
  password: string;
  role: 'jobSeeker' | 'employer' | 'admin';
  isVerified: boolean;
  verificationCode: string;
  verificationCodeExpires: Date | null;
  sessions: {
    token: string;
    device: {
      name: string;
      os: string;
      browser: string;
      type: 'mobile' | 'desktop' | 'tablet' | 'bot';
    };
    ipAddress: string;
    location: {
      country?: string;
      city?: string;
      coordinates?: [number, number];
    };
    lastActivity: Date;
    isCurrent: boolean;
  }[];
  googleId?: string;
  googleRefreshToken?: string;
  profilePicture: string;
  profile: {
    bio: string;
    technologies: string[];
    socials: {
      linkedin: string;
      twitter: string;
      github: string;
    };
    location: {
      country: string;
      city: string;
      coordinates: [number, number];
    };
    companyDetails: {
      companyName: string;
      website: string;
      about: string;
      companyLogo: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// Export type for a User Document (with Mongoose functionality)
export type UserDocument = HydratedDocument<User>;
