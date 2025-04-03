import {
  Injectable,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateJobDto } from './dto/create-job.dto';
import { Job } from './schema/job.schema';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectModel('Job') private readonly jobModel: Model<Job>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async createJob(
    employerId: string,
    companyId: string,
    createJobDto: CreateJobDto,
    posterFile?: Express.Multer.File,
  ): Promise<Job> {
    this.logger.log(`Creating job for employer: ${employerId}`);

    try {
      let posterUrl = '';

      if (posterFile) {
        this.logger.log('Uploading job poster to Cloudinary');
        try {
          posterUrl = await this.cloudinaryService.uploadImage(
            posterFile,
            'job_posters',
          );
          this.logger.log('Poster uploaded successfully');
        } catch (error) {
          this.logger.error('Failed to upload poster:', error);
          throw new BadRequestException('Failed to upload job poster');
        }
      }

      // Restructure the data to match the schema
      const jobData = {
        employer: employerId,
        company: companyId,
        title: createJobDto.title,
        subtitle: createJobDto.subtitle,
        jobType: createJobDto.jobType,
        category: createJobDto.category,
        requirements: createJobDto.requirements,
        technicalRequirements: createJobDto.technicalRequirements || [],
        description: createJobDto.description,
        salary: {
          range: {
            min: createJobDto.salaryMin,
            max: createJobDto.salaryMax,
          },
          currency: createJobDto.salaryCurrency || 'USD',
          period: createJobDto.salaryPeriod || 'yearly',
          isNegotiable: createJobDto.salaryNegotiable ?? true,
        },
        location: {
          type: createJobDto.locationType,
          country: createJobDto.locationCountry || '',
          city: createJobDto.locationCity || '',
          address: createJobDto.locationAddress || '',
        },
        applicationDeadline: createJobDto.applicationDeadline,
        experienceLevel: createJobDto.experienceLevel,
        benefits: createJobDto.benefits || [],
        poster: posterUrl,
        status: 'open',
        applicationCount: 0,
        views: 0,
        isPromoted: false,
        applicationsEnabled: true,
      };

      const job = new this.jobModel(jobData);
      const savedJob = await job.save();

      this.logger.log('Job created successfully:', savedJob._id);
      return savedJob;
    } catch (error) {
      this.logger.error('Failed to create job:', error);

      if (error.code === 11000) {
        throw new BadRequestException(
          'A job with these details already exists',
        );
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to create job');
    }
  }
}
