// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './gaurd/jwt.strategy'; // Adjust the path if needed
import { JwtAuthGuard } from './gaurd/jwt-auth.guard'; // Optional, you'll use it in controllers as needed

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'yourSecretKey', // Set your JWT_SECRET in your .env file ideally
      signOptions: { expiresIn: '1d' }, // Token expiry time
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
