import {
  Controller,
  Post,
  Get,
  Put,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Query,
  Param,
  Request,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { multerMemoryConfig } from '../config/multer.config';
import { JwtAuthGuard } from 'src/auth/gaurd/jwt-auth.guard';
import { Job } from './schema/job.schema';
import { SearchJobsDto } from './dto/search-job.dto';
import { JobResponseDto } from './dto/job-response.dto';

@Controller('jobs')
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(private readonly jobsService: JobsService) {}

  // ==================== PROTECTED ENDPOINTS (Require Auth) ====================

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('poster', multerMemoryConfig))
  async createJob(
    @Request() req,
    @Body() createJobDto: CreateJobDto,
    @UploadedFile() posterFile?: Express.Multer.File,
  ): Promise<Job> {
    this.logger.log('Creating new job - User ID:', req.user._id);

    if (!req.user.role || req.user.role !== 'employer') {
      throw new BadRequestException('Only employers can post jobs');
    }

    try {
      let companyId = req.user.company;
      const tempCompanyId = '000000000000000000000000';
      if (!companyId) {
        console.log(
          'Company ID not found, using temporary placeholder:',
          tempCompanyId,
        );
        companyId = tempCompanyId;
      }

      const job = await this.jobsService.createJob(
        req.user._id,
        companyId,
        createJobDto,
        posterFile,
      );

      this.logger.log('Job created successfully:', job._id?.toString());
      return job;
    } catch (error) {
      this.logger.error('Failed to create job:', error);
      throw error;
    }
  }

  @Get('employer')
  @UseGuards(JwtAuthGuard)
  async getEmployerJobs(@Request() req) {
    return this.jobsService.getEmployerJobs(req.user._id);
  }

  @Get('employer/stats')
  @UseGuards(JwtAuthGuard)
  async getEmployerJobsStats(@Request() req) {
    return this.jobsService.getEmployerJobsStats(req.user._id);
  }

  @Get('employer/recent-activity')
  @UseGuards(JwtAuthGuard)
  async getRecentJobsActivity(@Request() req) {
    return this.jobsService.getRecentJobsActivity(req.user._id);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateJobStatus(
    @Param('id') jobId: string,
    @Request() req,
    @Body('status') status: 'open' | 'closed' | 'draft' | 'archived',
  ) {
    return this.jobsService.updateJobStatus(jobId, req.user._id, status);
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard)
  async duplicateJob(@Param('id') jobId: string, @Request() req) {
    return this.jobsService.duplicateJob(jobId, req.user._id);
  }

  // ==================== PUBLIC ENDPOINTS (No Auth Required) ====================

  /**
   * PUBLIC: Get active jobs - No authentication required
   * Anyone can view the job listings
   */
  @Get()
  // REMOVED @UseGuards(JwtAuthGuard) - This is now public!
  async getActiveJobs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<JobResponseDto> {
    this.logger.log(
      `PUBLIC - Fetching active jobs - Page: ${page || 1}, Limit: ${limit || 10}`,
    );
    try {
      return await this.jobsService.getActiveJobs(
        page ? parseInt(String(page)) : 1,
        limit ? parseInt(String(limit)) : 10,
      );
    } catch (error) {
      this.logger.error('Failed to fetch active jobs:', error);
      throw error;
    }
  }

  /**
   * PUBLIC: Search and filter jobs - No authentication required
   * Anyone can search through job listings
   */
  @Get('search')
  // REMOVED @UseGuards(JwtAuthGuard) - This is now public!
  async searchJobs(
    @Query() searchJobsDto: SearchJobsDto,
  ): Promise<JobResponseDto> {
    this.logger.log('PUBLIC - Searching jobs with criteria:', searchJobsDto);
    try {
      return await this.jobsService.searchJobs(searchJobsDto);
    } catch (error) {
      this.logger.error('Failed to search jobs:', error);
      throw error;
    }
  }

  /**
   * PUBLIC: Get job details by ID - No authentication required
   * Anyone can view individual job details
   */
  @Get(':id/details')
  // REMOVED @UseGuards(JwtAuthGuard) - This is now public!
  async getJobDetails(@Param('id') jobId: string): Promise<Job> {
    this.logger.log(`PUBLIC - Fetching details for job: ${jobId}`);
    try {
      return await this.jobsService.getJobById(jobId);
    } catch (error) {
      this.logger.error(`Failed to fetch job details for ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * PUBLIC: Increment job views - No authentication required
   * Track views even for non-logged-in users
   */
  @Put(':id/view')
  // REMOVED @UseGuards(JwtAuthGuard) - This is now public!
  async incrementJobViews(@Param('id') jobId: string) {
    await this.jobsService.incrementJobViews(jobId);
    return { success: true };
  }

  /**
   * PUBLIC: Get company jobs - No authentication required
   * Anyone can view jobs posted by a specific company
   */
  @Get('company/:companyId')
  // Already public - keeping it this way
  async getCompanyJobs(@Param('companyId') companyId: string) {
    return this.jobsService.getCompanyJobs(companyId);
  }
}
