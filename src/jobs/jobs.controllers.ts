import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
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

@Controller('jobs')
export class JobsController {
  private readonly logger = new Logger(JobsController.name);

  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('poster', multerMemoryConfig))
  async createJob(
    @Request() req,
    @Body() createJobDto: CreateJobDto,
    @UploadedFile() posterFile?: Express.Multer.File,
  ): Promise<Job> {
    // Add return type
    this.logger.log('Creating new job - User ID:', req.user._id);

    if (!req.user.role || req.user.role !== 'employer') {
      throw new BadRequestException('Only employers can post jobs');
    }

    try {
      let companyId = req.user.company;
      // if (!companyId) {
      //   throw new BadRequestException(
      //     'Employer must be associated with a company to post jobs',
      //   );
      // }
      const tempCompanyId = '000000000000000000000000'; // Temporary placeholder
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

      this.logger.log('Job created successfully:', job._id?.toString()); // Use optional chaining and toString()
      return job;
    } catch (error) {
      this.logger.error('Failed to create job:', error);
      throw error;
    }
  }
}
