// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  UseGuards,
  Param,
  HttpStatus,
  HttpCode,
  Logger, // Add this import
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../auth/gaurd/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    this.logger.log(`Registration attempt for email: ${registerDto.email}`);
    this.logger.debug(`Register DTO: ${JSON.stringify(registerDto)}`);

    try {
      const result = await this.authService.register(registerDto, req);
      this.logger.log(`Registration successful for: ${registerDto.email}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Registration failed for ${registerDto.email}: ${error.message}`,
      );
      throw error;
    }
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
    @Req() req: Request,
  ) {
    this.logger.log(`Verification attempt for email: ${verifyEmailDto.email}`);

    try {
      const result = await this.authService.verifyEmail(
        verifyEmailDto.email,
        verifyEmailDto.code,
        req,
      );
      this.logger.log(`Verification successful for: ${verifyEmailDto.email}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Verification failed for ${verifyEmailDto.email}: ${error.message}`,
      );
      throw error;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);

    try {
      const result = await this.authService.login(
        loginDto.email,
        loginDto.password,
        req,
      );
      this.logger.log(`Login successful for: ${loginDto.email}`);
      return result;
    } catch (error) {
      this.logger.error(`Login failed for ${loginDto.email}: ${error.message}`);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  async getSessions(@Req() req: any) {
    this.logger.log(`Get sessions for user ID: ${req.user._id}`);
    return this.authService.getUserSessions(req.user._id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout/:sessionId')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any, @Param('sessionId') sessionId: string) {
    this.logger.log(
      `Logout for user ID: ${req.user._id}, session ID: ${sessionId}`,
    );
    return this.authService.logout(req.user._id, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@Req() req: any) {
    this.logger.log(`Logout all for user ID: ${req.user._id}`);
    return this.authService.logout(req.user._id, 'all');
  }
}
