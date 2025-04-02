// src/auth/auth.service.ts
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { UserDocument } from '../users/schema/user.schema';
import { DeviceDetectorService } from '../common/middleware/device-detector.service';
import { EmailService } from '../common/utils/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private deviceDetectorService: DeviceDetectorService,
    private emailService: EmailService,
  ) {}

  // These are just the updated methods for auth.service.ts with better logging

  async register(userData: any, req: Request) {
    const { username, email, password } = userData;

    console.log(`Registering user: ${username}`);

    // Check if email already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`Password hashed for user: ${username}`);

    // Get device info
    const deviceInfo = this.deviceDetectorService.getDeviceInfo(req);
    console.log('Device info detected:', deviceInfo);

    // Generate verification code (6 digits)
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const verificationCodeExpires = new Date(Date.now() + 25 * 60 * 1000); // 25 minutes
    console.log(`Generated verification code for user: ${username}`);

    // Create new user
    const newUser = new this.userModel({
      username,
      email,
      password: hashedPassword,
      verificationCode,
      verificationCodeExpires,
      sessions: [], // Will add first session after verification
    });

    await newUser.save();
    console.log(`New user saved: ${newUser._id}`);

    // Send verification email
    const emailResult = await this.emailService.sendVerificationEmail(
      email,
      verificationCode,
      username,
    );

    if (!emailResult.success) {
      // Even if email fails, we'll return success but log the error
      console.error('Failed to send verification email:', emailResult.error);
    }

    return {
      success: true,
      message:
        'Registration successful. Please check your email for verification code.',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
    };
  }

  async verifyEmail(email: string, code: string, req: Request) {
    console.log(`Verifying email for: ${email} with code: ${code}`);

    const user = await this.userModel.findOne({ email });

    if (!user) {
      console.log(`Verification failed: User not found for email ${email}`);
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      console.log(`User ${email} is already verified`);
      return {
        success: true,
        message: 'Email already verified. Please login.',
      };
    }

    // Check if verification code is valid and not expired
    if (
      user.verificationCode !== code ||
      !user.verificationCodeExpires ||
      (user.verificationCodeExpires &&
        user.verificationCodeExpires < new Date())
    ) {
      const isExpired =
        user.verificationCodeExpires &&
        user.verificationCodeExpires < new Date();
      console.log(
        `Verification failed: ${isExpired ? 'Code expired' : 'Invalid code'}`,
      );

      throw new BadRequestException(
        user.verificationCodeExpires &&
        user.verificationCodeExpires < new Date()
          ? 'Verification code has expired. Please request a new one.'
          : 'Invalid verification code.',
      );
    }

    // Mark as verified and clear verification code
    user.isVerified = true;
    user.verificationCode = '';
    user.verificationCodeExpires = null;

    console.log(`Email verified for user: ${user.username}`);
    await user.save();

    // Automatically log the user in
    console.log(`Creating session for verified user: ${user.username}`);
    return this.createUserSession(user, req);
  }

  async login(email: string, password: string, req: Request) {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Email not verified. Please verify your email first.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createUserSession(user, req);
  }

  // In your auth.service.ts, update the createUserSession method:

  async createUserSession(user: UserDocument, req: Request) {
    console.log(`Creating session for user: ${user.email}`);

    const deviceInfo = this.deviceDetectorService.getDeviceInfo(req);
    console.log(
      `Device info for session:`,
      JSON.stringify(deviceInfo, null, 2),
    );

    // Create JWT payload
    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
    };

    // Generate JWT token
    const token = this.jwtService.sign(payload);
    console.log(`Generated JWT token for user: ${user.email}`);

    // Check if this device/location combination is new
    const isNewDevice = this.isNewDeviceOrLocation(user, deviceInfo);
    console.log(`Is this a new device? ${isNewDevice}`);

    // Create session object with explicit coordinates
    const session = {
      token,
      device: deviceInfo.device,
      ipAddress: deviceInfo.ipAddress,
      location: {
        country: deviceInfo.location.country || '',
        city: deviceInfo.location.city || '',
        coordinates: [0, 0], // Always use default coordinates for now
      },
      lastActivity: new Date(),
      isCurrent: true,
    };

    console.log(`Session object: ${JSON.stringify(session, null, 2)}`);

    // Update or add session
    if (!isNewDevice) {
      console.log(`Updating existing session for ${user.email}`);
      try {
        const updateResult = await this.userModel.updateOne(
          {
            _id: user._id,
            'sessions.device.name': deviceInfo.device.name,
            'sessions.device.browser': deviceInfo.device.browser,
            'sessions.ipAddress': deviceInfo.ipAddress,
          },
          {
            $set: {
              'sessions.$.token': token,
              'sessions.$.lastActivity': new Date(),
              'sessions.$.isCurrent': true,
            },
          },
        );
        console.log(`Update result: ${JSON.stringify(updateResult)}`);
      } catch (error) {
        console.error(`Error updating session: ${error.message}`);
        throw error;
      }
    } else {
      console.log(`Adding new session for ${user.email}`);
      try {
        // Direct MongoDB approach to add session
        const updateResult = await this.userModel.updateOne(
          { _id: user._id },
          {
            $push: {
              sessions: session,
            },
          },
        );
        console.log(
          `Direct MongoDB update result: ${JSON.stringify(updateResult)}`,
        );
      } catch (error) {
        console.error(`Error directly adding session: ${error.message}`);

        // Fallback to the original approach
        try {
          user.sessions.push(session as any);
          await user.save();
          console.log(`User saved with session via Mongoose: ${user.email}`);
        } catch (saveError) {
          console.error(`Error saving user with session: ${saveError.message}`);
          throw saveError;
        }
      }
    }

    try {
      // Verify session was added by fetching user again
      const updatedUser = await this.userModel.findById(user._id);
      if (updatedUser) {
        console.log(`User now has ${updatedUser.sessions.length} sessions`);
      } else {
        console.error('Failed to fetch updated user. User is null.');
      }
    } catch (error) {
      console.error(`Error verifying sessions: ${error.message}`);
    }

    return {
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isNewDevice,
      },
    };
  }

  private isNewDeviceOrLocation(user: UserDocument, deviceInfo: any): boolean {
    if (!user.sessions || user.sessions.length === 0) return true;

    // Check if we have a session with matching device and IP
    return !user.sessions.some(
      (session) =>
        session.device.name === deviceInfo.device.name &&
        session.device.browser === deviceInfo.device.browser &&
        session.ipAddress === deviceInfo.ipAddress,
    );
  }

  async validateToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userModel.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Check if token exists in user's sessions
      const tokenExists = user.sessions.some(
        (session) => session.token === token,
      );
      if (!tokenExists) {
        throw new UnauthorizedException('Session invalid or expired');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async getUserSessions(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user.sessions.map((session) => ({
      id: (session as any)._id || new Types.ObjectId(), // Handle MongoDB ObjectId
      device: session.device,
      location: session.location,
      ipAddress: session.ipAddress,
      lastActivity: session.lastActivity,
      isCurrent: session.isCurrent,
    }));
  }

  async logout(userId: string, sessionId: string | 'all') {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (sessionId === 'all') {
      // Clear all sessions
      user.sessions = [];
    } else {
      // Remove specific session
      user.sessions = user.sessions.filter(
        (session) => (session as any)._id.toString() !== sessionId,
      );
    }

    await user.save();
    return { success: true, message: 'Logged out successfully' };
  }
}
