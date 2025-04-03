import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDocument } from '../../users/schema/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectModel('User') private userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    console.log('JWT Strategy - Payload received:', payload);
    const userId = payload.sub;
    console.log('JWT Strategy - Looking for user with ID:', userId);

    const user = await this.userModel.findById(userId);
    console.log('JWT Strategy - User found:', user?._id);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Return a plain object with all necessary ID fields
    return {
      _id: user._id.toString(),
      id: user._id.toString(),
      userId: user._id.toString(), // Added this for backwards compatibility
      email: user.email,
      role: user.role,
      // Add other necessary user fields
    };
  }
}
