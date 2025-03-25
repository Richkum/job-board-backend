import { Controller, Post, Body, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from 'src/users/schema/user.schema';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
  ): Promise<User> {
    // Extract IP address and device details from request body
    const ipAddress = req.body.ipAddress;
    const deviceInfo = {
      name: req.body.deviceName,
      os: req.body.deviceOs,
      browser: req.body.deviceBrowser,
      type: req.body.deviceType, // optional: mobile, desktop, tablet, or bot
    };

    return this.authService.register(registerDto, ipAddress, deviceInfo);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    // Extract IP and device info from request body
    const ipAddress = req.body.ipAddress;
    const deviceInfo = {
      name: req.body.deviceName,
      os: req.body.deviceOs,
      browser: req.body.deviceBrowser,
      type: req.body.deviceType,
    };

    return this.authService.login(loginDto, ipAddress, deviceInfo);
  }
}
