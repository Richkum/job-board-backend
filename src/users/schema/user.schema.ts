import { HydratedDocument, Schema } from 'mongoose';

export const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
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
    profile: {
      type: {
        bio: String,
        technologies: [String],
        socials: {
          linkedin: { type: String, optional: true },
          twitter: { type: String, optional: true },
          github: { type: String, optional: true },
        },
        location: {
          country: { type: String, optional: true },
          city: { type: String, optional: true },
          coordinates: { type: [Number], optional: true },
        },
        deviceInfo: [
          {
            deviceName: String,
            ipAddress: String,
            lastLogin: Date,
          },
        ],
        profilePicture: String,
        companyDetails: {
          companyName: { type: String, optional: true },
          website: { type: String, optional: true },
          about: { type: String, optional: true },
          companyLogo: { type: String, optional: true },
        },
      },
      default: {
        bio: '',
        technologies: [],
        socials: {},
        location: {},
        deviceInfo: [],
        profilePicture: '',
        companyDetails: {},
      },
    },
  },
  { timestamps: true }, // This adds createdAt and updatedAt fields
);

export interface User {
  name: string;
  email: string;
  password: string;
  role: 'jobSeeker' | 'employer' | 'admin';
  isVerified: boolean;
  verificationCode: string;
  profile: {
    bio: string;
    technologies: string[];
    socials: {
      linkedin?: string;
      twitter?: string;
      github?: string;
    };
    location: {
      country?: string;
      city?: string;
      coordinates?: [number, number];
    };
    deviceInfo: {
      deviceName: string;
      ipAddress: string;
      lastLogin: Date;
    }[];
    profilePicture: string;
    companyDetails?: {
      companyName?: string;
      website?: string;
      about?: string;
      companyLogo?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;
