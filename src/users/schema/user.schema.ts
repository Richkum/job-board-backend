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
    sessions: [
      {
        token: String, // Stores session tokens (e.g., JWT or other session identifier)
        deviceName: String,
        ipAddress: String,
        loginLocation: {
          country: String,
          city: String,
          coordinates: [Number],
        },
        lastLogin: Date,
      },
    ],
    googleId: {
      type: String,
      default: null, // for Google OAuth users
    },
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

// Interface to define the TypeScript User type
export interface User {
  username: string;
  email: string;
  password: string;
  role: 'jobSeeker' | 'employer' | 'admin';
  isVerified: boolean;
  verificationCode: string;
  sessions: {
    token: string;
    deviceName: string;
    ipAddress: string;
    loginLocation: {
      country?: string;
      city?: string;
      coordinates?: [number, number];
    };
    lastLogin: Date;
  }[];
  googleId?: string;
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
