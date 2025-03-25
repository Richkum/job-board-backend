import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/users/schema/user.schema';

@Injectable()
export class AuthSchedule {
  constructor(
    @InjectModel('User') private readonly userModel: Model<UserDocument>,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpiredVerificationCodes() {
    await this.userModel.updateMany(
      {
        isVerified: false,
        verificationCodeExpires: { $lt: new Date() },
        verificationCode: { $ne: '' },
      },
      {
        $set: {
          verificationCode: '',
          verificationCodeExpires: null,
        },
      },
    );
  }
}
