import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApplicationService } from './application.service';
import {
  CreateApplicationDto,
  UpdateApplicationStatusDto,
  WithdrawApplicationDto,
  ApplicationFilterDto,
  PaginatedApplicationsResponseDto,
  ApplicationResponseDto,
} from './dto/application.dto';
import { JwtAuthGuard } from 'src/auth/gaurd/jwt-auth.guard';

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationController {
  private readonly logger = new Logger(ApplicationController.name);

  constructor(private readonly applicationService: ApplicationService) {}

  // For Job Seekers
  @Post()
  async createApplication(
    @Request() req,
    @Body() createApplicationDto: CreateApplicationDto,
  ): Promise<ApplicationResponseDto> {
    this.logger.log(
      `Creating new application for job ${createApplicationDto.jobId} - User: ${req.user._id}`,
    );

    if (req.user.role !== 'jobSeeker') {
      throw new BadRequestException('Only job seekers can apply for jobs');
    }

    try {
      return await this.applicationService.createApplication(
        createApplicationDto,
        req.user._id,
      );
    } catch (error) {
      this.logger.error(
        `Application creation failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('my-applications')
  async getMyApplications(
    @Request() req,
    @Query() filters: ApplicationFilterDto,
  ): Promise<PaginatedApplicationsResponseDto> {
    this.logger.log(`Fetching applications for user ${req.user._id}`);

    if (req.user.role !== 'job-seeker') {
      throw new BadRequestException(
        'Only job seekers can view their applications',
      );
    }

    try {
      return await this.applicationService.getMyApplications(
        req.user._id,
        filters,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch applications: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // For Employers
  @Get('my-jobs/applications')
  async getAllJobsApplications(
    @Request() req,
    @Query() filters: ApplicationFilterDto,
  ): Promise<PaginatedApplicationsResponseDto> {
    this.logger.log(`Fetching all applications for employer ${req.user._id}`);

    if (req.user.role !== 'employer') {
      throw new BadRequestException('Only employers can view job applications');
    }

    try {
      return await this.applicationService.getAllJobsApplications(
        req.user._id,
        filters,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch applications: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('job/:jobId')
  async getJobApplications(
    @Request() req,
    @Param('jobId') jobId: string,
    @Query() filters: ApplicationFilterDto,
  ): Promise<PaginatedApplicationsResponseDto> {
    this.logger.log(`Fetching applications for job ${jobId}`);

    if (req.user.role !== 'employer') {
      throw new BadRequestException('Only employers can view job applications');
    }

    try {
      return await this.applicationService.getJobApplications(
        jobId,
        req.user._id,
        filters,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch job applications: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Common endpoints
  @Get(':id')
  async getApplicationById(
    @Request() req,
    @Param('id') applicationId: string,
  ): Promise<ApplicationResponseDto> {
    this.logger.log(`Fetching application details ${applicationId}`);

    try {
      return await this.applicationService.getApplicationById(
        applicationId,
        req.user._id,
        req.user.role,
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch application: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Patch(':id/status')
  async updateStatus(
    @Request() req,
    @Param('id') applicationId: string,
    @Body() updateStatusDto: UpdateApplicationStatusDto,
  ): Promise<ApplicationResponseDto> {
    this.logger.log(
      `Updating application ${applicationId} status to ${updateStatusDto.status}`,
    );

    if (req.user.role !== 'employer') {
      throw new BadRequestException(
        'Only employers can update application status',
      );
    }

    try {
      return await this.applicationService.updateApplicationStatus(
        applicationId,
        req.user._id,
        updateStatusDto,
      );
    } catch (error) {
      this.logger.error(`Status update failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Patch(':id/withdraw')
  async withdrawApplication(
    @Request() req,
    @Param('id') applicationId: string,
    @Body() withdrawDto: WithdrawApplicationDto,
  ): Promise<ApplicationResponseDto> {
    this.logger.log(`Withdrawing application ${applicationId}`);

    if (req.user.role !== 'job-seeker') {
      throw new BadRequestException(
        'Only job seekers can withdraw applications',
      );
    }

    try {
      return await this.applicationService.withdrawApplication(
        applicationId,
        req.user._id,
        withdrawDto,
      );
    } catch (error) {
      this.logger.error(`Withdrawal failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
