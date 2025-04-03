// src/users/users.controller.ts
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/gaurd/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getMyProfile(@Request() req) {
    console.log('Controller - User object:', req.user); // Add this log
    return this.usersService.getUserProfile(req.user._id); // Changed from userId to _id
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUserProfile(@Param('id') id: string) {
    return this.usersService.getUserProfile(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/profile')
  @UseInterceptors(FileInterceptor('profilePicture'))
  async updateProfile(
    @Param('id') id: string,
    @Request() req,
    @Body() rawBody: any,
    @UploadedFile() profilePicture?: Express.Multer.File,
  ) {
    // Parse the JSON data from the form
    const updateProfileDto: UpdateProfileDto = rawBody.data
      ? JSON.parse(rawBody.data)
      : {};

    return this.usersService.updateProfile(
      id,
      req.user.userId,
      updateProfileDto,
      profilePicture,
    );
  }
}
