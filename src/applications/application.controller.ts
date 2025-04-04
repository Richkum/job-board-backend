import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ApplicationService } from './application.service';
import {
  CreateApplicationDto,
  UpdateApplicationStatusDto,
  WithdrawApplicationDto,
  ApplicationFilterDto,
} from './dto/application.dto';
import { JwtAuthGuard } from 'src/auth/gaurd/jwt-auth.guard';

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  async createApplication(
    @Request() req,
    @Body() createApplicationDto: CreateApplicationDto,
  ) {
    if (req.user.userType !== 'job-seeker') {
      throw new BadRequestException('Only job seekers can apply for jobs');
    }
    return this.applicationService.createApplication(
      createApplicationDto,
      req.user._id,
    );
  }

  // ... (rest of the controller methods remain the same, just change ApplicationsService to ApplicationService)
}
