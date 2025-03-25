import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import * as geoip from 'geoip-lite';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User, UserDocument } from 'src/users/schema/user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  // Helper function to generate a random 6-digit verification code as a string
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Helper function to get location info based on IP address using geoip-lite
  private getLocation(ipAddress: string): {
    country: string;
    city: string;
    coordinates: [number, number];
  } {
    const geo = geoip.lookup(ipAddress);
    return {
      country: geo?.country || '',
      city: geo?.city || '',
      coordinates: geo?.ll
        ? ([geo.ll[1], geo.ll[0]] as [number, number])
        : [0, 0],
    };
  }

  /**
   * Registration function:
   * - Checks if the email is already registered.
   * - Hashes the password.
   * - Generates a 6-digit verification code.
   * - Saves the user along with initial session details (including location from IP).
   */
  async register(
    registerDto: RegisterDto,
    ipAddress: string,
    deviceInfo: {
      name: string;
      os: string;
      browser: string;
      type?: 'mobile' | 'desktop' | 'tablet' | 'bot';
    },
  ): Promise<User> {
    const { username, email, password } = registerDto;

    // Check if the user already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new BadRequestException('Email is already registered');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a 6-digit verification code
    const verificationCode = this.generateVerificationCode();

    // Retrieve location info based on IP
    const location = this.getLocation(ipAddress);

    // Create a new user with default values for optional fields and initial session info
    const newUser = new this.userModel({
      username,
      email,
      password: hashedPassword,
      role: 'jobSeeker', // default role
      isVerified: false,
      verificationCode,
      sessions: [
        {
          token: '', // token will be updated on login
          device: {
            name: deviceInfo.name,
            os: deviceInfo.os,
            browser: deviceInfo.browser,
            type: deviceInfo.type || 'desktop',
          },
          ipAddress,
          location,
          lastActivity: new Date(),
          isCurrent: true,
        },
      ],
      googleId: null,
      googleRefreshToken: null,
      profilePicture: '',
      profile: {
        bio: '',
        technologies: [],
        socials: {
          linkedin: '',
          twitter: '',
          github: '',
        },
        location: {
          country: '',
          city: '',
          coordinates: [0, 0],
        },
        companyDetails: {
          companyName: '',
          website: '',
          about: '',
          companyLogo: '',
        },
      },
    });

    const savedUser = await newUser.save();

    // TODO: Send the verification code to the user's email/phone

    return savedUser;
  }

  /**
   * Account verification function:
   * - Checks if the provided code matches the stored verification code.
   * - Sets the account as verified and clears the verification code.
   */
  async verifyAccount(
    email: string,
    code: string,
  ): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('User is already verified');
    }

    if (user.verificationCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    user.isVerified = true;
    user.verificationCode = '';
    await user.save();

    return { message: 'Account verified successfully' };
  }

  /**
   * Login function:
   * - Verifies user credentials.
   * - Ensures the account is verified.
   * - Updates the sessions info with the latest login details (including location).
   * - Generates and returns a JWT token.
   */
  async login(
    loginDto: LoginDto,
    ipAddress: string,
    deviceInfo: {
      name: string;
      os: string;
      browser: string;
      type?: 'mobile' | 'desktop' | 'tablet' | 'bot';
    },
  ): Promise<{ accessToken: string }> {
    const { email, password } = loginDto;
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Ensure the user has verified their account
    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Account not verified. Please verify your account.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Retrieve location info based on IP
    const location = this.getLocation(ipAddress);

    // Update session info: check if a session with the same device details already exists
    const sessionIndex = user.sessions.findIndex(
      (session) =>
        session.device.name === deviceInfo.name &&
        session.device.os === deviceInfo.os &&
        session.device.browser === deviceInfo.browser,
    );

    if (sessionIndex !== -1) {
      // Update existing session details
      user.sessions[sessionIndex].lastActivity = new Date();
      user.sessions[sessionIndex].ipAddress = ipAddress;
      user.sessions[sessionIndex].location = location;
      user.sessions[sessionIndex].isCurrent = true;
    } else {
      // Add a new session record
      user.sessions.push({
        token: '', // will be updated below
        device: {
          name: deviceInfo.name,
          os: deviceInfo.os,
          browser: deviceInfo.browser,
          type: deviceInfo.type || 'desktop',
        },
        ipAddress,
        location,
        lastActivity: new Date(),
        isCurrent: true,
      });
    }

    // Generate the JWT token
    const payload = { sub: user._id, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    // Optionally, tie the token to the latest session record
    const latestSession = user.sessions[user.sessions.length - 1];
    latestSession.token = accessToken;

    await user.save();

    return { accessToken };
  }
}
