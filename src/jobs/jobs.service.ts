import {
  Injectable,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateJobDto } from './dto/create-job.dto';
import { SearchJobsDto } from './dto/search-job.dto';
import { JobResponseDto } from './dto/job-response.dto';
import { Job } from './schema/job.schema';
import { PaginatedJobsResponse } from './interface/paginated-jobs.interface';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectModel('Job') private readonly jobModel: Model<Job>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  //  createJob method...

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

  async getEmployerJobs(employerId: string): Promise<Job[]> {
    try {
      return await this.jobModel
        .find({ employer: employerId })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error(
        `Failed to get employer jobs for ${employerId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to fetch employer jobs');
    }
  }

  async getCompanyJobs(companyId: string): Promise<Job[]> {
    try {
      return await this.jobModel
        .find({ company: companyId })
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error(`Failed to get company jobs for ${companyId}:`, error);
      throw new InternalServerErrorException('Failed to fetch company jobs');
    }
  }

  async incrementJobViews(jobId: string): Promise<void> {
    try {
      await this.jobModel.findByIdAndUpdate(jobId, { $inc: { views: 1 } });
    } catch (error) {
      this.logger.error(`Failed to increment views for job ${jobId}:`, error);
    }
  }

  // Add these methods to your JobsService class

  async getEmployerJobsStats(employerId: string) {
    try {
      const stats = await this.jobModel.aggregate([
        {
          $match: {
            employer: new Types.ObjectId(employerId), // Convert string ID to ObjectId
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalViews: { $sum: '$views' },
            totalApplications: { $sum: '$applicationCount' },
          },
        },
      ]);

      // Add debug log to see what's coming from the database
      console.log('Raw stats from database:', stats);

      const formattedStats = {
        total: 0,
        open: 0,
        closed: 0,
        draft: 0,
        archived: 0,
        totalViews: 0,
        totalApplications: 0,
      };

      stats.forEach((stat) => {
        formattedStats[stat._id] = stat.count;
        formattedStats.total += stat.count;
        formattedStats.totalViews += stat.totalViews;
        formattedStats.totalApplications += stat.totalApplications;
      });

      // Add debug log for formatted stats
      console.log('Formatted stats:', formattedStats);

      return formattedStats;
    } catch (error) {
      this.logger.error(
        `Failed to get employer stats for ${employerId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to fetch employer stats');
    }
  }

  async updateJobStatus(
    jobId: string,
    employerId: string,
    status: 'open' | 'closed' | 'draft' | 'archived',
  ) {
    try {
      // First check if the job exists and belongs to the employer
      const job = await this.jobModel.findOne({
        _id: jobId,
        employer: employerId,
      });

      if (!job) {
        throw new BadRequestException('Job not found or unauthorized');
      }

      // Prepare update object
      const updateData: any = { status };

      // If status is closed or archived, disable applications
      if (status === 'closed' || status === 'archived') {
        updateData.applicationsEnabled = false;
      }

      // Use updateOne with validateBeforeSave: false to bypass schema validation
      await this.jobModel.updateOne(
        { _id: jobId },
        { $set: updateData },
        { validateBeforeSave: false },
      );

      // Return the updated job
      return await this.jobModel.findById(jobId);
    } catch (error) {
      this.logger.error(`Failed to update job status ${jobId}:`, error);
      throw error;
    }
  }

  async getRecentJobsActivity(employerId: string) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      return await this.jobModel
        .find({
          employer: employerId,
          $or: [
            { createdAt: { $gte: thirtyDaysAgo } },
            { updatedAt: { $gte: thirtyDaysAgo } },
            { status: 'open' },
          ],
        })
        .select('title status views applicationCount createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .limit(10);
    } catch (error) {
      this.logger.error(
        `Failed to get recent jobs activity for ${employerId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to fetch recent activity');
    }
  }

  async duplicateJob(jobId: string, employerId: string): Promise<Job> {
    try {
      const originalJob = await this.jobModel.findOne({
        _id: jobId,
        employer: employerId,
      });

      if (!originalJob) {
        throw new BadRequestException('Job not found or unauthorized');
      }

      // Use Partial<Job> to indicate that some properties might be removed
      const newJobData = originalJob.toObject() as Partial<Job>;
      delete newJobData._id;
      delete newJobData.createdAt;
      delete newJobData.updatedAt;

      // Modify some fields for the duplicate
      newJobData.title = `${newJobData.title} (Copy)`;
      newJobData.status = 'draft';
      newJobData.views = 0;
      newJobData.applicationCount = 0;
      newJobData.applicationsEnabled = false;

      const newJob = new this.jobModel(newJobData);
      return await newJob.save();
    } catch (error) {
      this.logger.error(`Failed to duplicate job ${jobId}:`, error);
      throw error;
    }
  }

  // async getActiveJobs(page = 1, limit = 10): Promise<JobResponseDto> {
  //   try {
  //     const currentDate = new Date();

  //     const query = {
  //       status: 'open',
  //       applicationDeadline: { $gt: currentDate },
  //       applicationsEnabled: true,
  //     };

  //     const [jobs, total] = await Promise.all([
  //       this.jobModel
  //         .find(query)
  //         .populate('company', 'name logo')
  //         .sort({ createdAt: -1 })
  //         .skip((page - 1) * limit)
  //         .limit(limit)
  //         .exec(),
  //       this.jobModel.countDocuments(query),
  //     ]);

  //     return {
  //       jobs,
  //       total,
  //       currentPage: page,
  //       totalPages: Math.ceil(total / limit),
  //       hasMore: page < Math.ceil(total / limit),
  //     };
  //   } catch (error) {
  //     this.logger.error('Failed to fetch active jobs:', error);
  //     throw new InternalServerErrorException('Failed to fetch active jobs');
  //   }
  // }

  // In your jobs.service.ts
  async getActiveJobs(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedJobsResponse> {
    try {
      const query = { status: 'open' };
      const skip = (page - 1) * limit;

      const [jobs, total] = await Promise.all([
        this.jobModel
          .find(query)
          // .populate('company', 'name logo website industry') // Make this optional
          .select('-company') // Temporarily exclude company field

          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        this.jobModel.countDocuments(query),
      ]);

      // Transform the jobs to include company info either from reference or inline data
      const transformedJobs = jobs.map((job) => ({
        ...job,
        company: job.company || {
          name: 'Company Name Not Available',
          logo: '/company-placeholder.png',
          website: null,
          industry: 'Not Specified',
        },
      }));

      return {
        jobs: transformedJobs,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      };
    } catch (error) {
      this.logger.error('Failed to fetch active jobs:', error);
      throw new InternalServerErrorException('Failed to fetch active jobs');
    }
  }

  async searchJobs(searchJobsDto: SearchJobsDto): Promise<JobResponseDto> {
    try {
      const {
        search,
        jobTypes,
        categories,
        locationTypes,
        country,
        city,
        experienceLevels,
        salaryMin,
        salaryMax,
        salaryCurrency,
        salaryPeriod,
        page = 1,
        limit = 10,
      } = searchJobsDto;

      const currentDate = new Date();

      // Base query
      const query: any = {
        status: 'open',
        applicationDeadline: { $gt: currentDate },
        applicationsEnabled: true,
      };

      // Add text search if provided
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { subtitle: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      // Add filters only if they are provided
      if (jobTypes?.length) {
        query.jobType = { $in: jobTypes };
      }

      if (categories?.length) {
        query.category = { $in: categories };
      }

      if (locationTypes?.length) {
        query['location.type'] = { $in: locationTypes };
      }

      if (country) {
        query['location.country'] = country;
      }

      if (city) {
        query['location.city'] = city;
      }

      if (experienceLevels?.length) {
        query.experienceLevel = { $in: experienceLevels };
      }

      // Salary filters
      if (salaryMin || salaryMax || salaryCurrency || salaryPeriod) {
        if (salaryMin) {
          query['salary.range.min'] = { $gte: salaryMin };
        }
        if (salaryMax) {
          query['salary.range.max'] = { $lte: salaryMax };
        }
        if (salaryCurrency) {
          query['salary.currency'] = salaryCurrency;
        }
        if (salaryPeriod) {
          query['salary.period'] = salaryPeriod;
        }
      }

      const [jobs, total] = await Promise.all([
        this.jobModel
          .find(query)
          .populate('company', 'name logo')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .exec(),
        this.jobModel.countDocuments(query),
      ]);

      return {
        jobs,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('Failed to search jobs:', error);
      throw new InternalServerErrorException('Failed to search jobs');
    }
  }

  async getJobById(jobId: string): Promise<Job> {
    try {
      const job = await this.jobModel
        .findById(jobId)
        .populate('company', 'name logo description')
        .exec();

      if (!job) {
        throw new BadRequestException('Job not found');
      }

      return job;
    } catch (error) {
      this.logger.error(`Failed to fetch job ${jobId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch job details');
    }
  }
}
