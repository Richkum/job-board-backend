import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose'; // Add this
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './gaurd/jwt.strategy';
import { JwtAuthGuard } from './gaurd/jwt-auth.guard';
import { EmailModule } from '../email/email.module';
import { AuthSchedule } from './auth.schedule';
import { UserSchema } from '../users/schema/user.schema'; // Add this

@Module({
  imports: [
    // Add this MongooseModule.forFeature
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
    ScheduleModule.forRoot(),
    EmailModule,
  ],
  providers: [AuthService, JwtStrategy, AuthSchedule],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
