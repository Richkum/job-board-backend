import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true }) // Adds createdAt and updatedAt fields automatically
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ enum: ['jobSeeker', 'employer', 'admin'], default: 'jobSeeker' })
  role: string;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: '' })
  verificationCode: string;

  @Prop({
    type: Object,
    default: {
      bio: '',
      technologies: [],
      socials: {},
      location: {},
      deviceInfo: [],
    },
  })
  profile: {
    bio: string;
    technologies: string[];
    socials: { linkedin?: string; twitter?: string; github?: string };
    location: {
      country?: string;
      city?: string;
      coordinates?: [number, number];
    };
    deviceInfo: { deviceName: string; ipAddress: string; lastLogin: Date }[];
    profilePicture: string;
    companyDetails?: {
      companyName?: string;
      website?: string;
      about?: string;
      companyLogo?: string;
    };
  };
}

export const UserSchema = SchemaFactory.createForClass(User);
