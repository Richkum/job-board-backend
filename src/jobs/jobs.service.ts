// import {
//   Injectable,
//   BadRequestException,
//   Logger,
//   InternalServerErrorException,
// } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model, Types } from 'mongoose';
// import { CloudinaryService } from '../cloudinary/cloudinary.service';
// import { CreateJobDto } from './dto/create-job.dto';
// import { SearchJobsDto } from './dto/search-job.dto';
// import { JobResponseDto } from './dto/job-response.dto';
// import { Job } from './schema/job.schema';
// import { PaginatedJobsResponse } from './interface/paginated-jobs.interface';

// @Injectable()
// export class JobsService {
//   private readonly logger = new Logger(JobsService.name);

//   constructor(
//     @InjectModel('Job') private readonly jobModel: Model<Job>,
//     private readonly cloudinaryService: CloudinaryService,
//   ) {}

//   //  createJob method...

//   async createJob(
//     employerId: string,
//     companyId: string,
//     createJobDto: CreateJobDto,
//     posterFile?: Express.Multer.File,
//   ): Promise<Job> {
//     this.logger.log(`Creating job for employer: ${employerId}`);

//     try {
//       let posterUrl = '';

//       if (posterFile) {
//         this.logger.log('Uploading job poster to Cloudinary');
//         try {
//           posterUrl = await this.cloudinaryService.uploadImage(
//             posterFile,
//             'job_posters',
//           );
//           this.logger.log('Poster uploaded successfully');
//         } catch (error) {
//           this.logger.error('Failed to upload poster:', error);
//           throw new BadRequestException('Failed to upload job poster');
//         }
//       }

//       // Restructure the data to match the schema
//       const jobData = {
//         employer: employerId,
//         company: companyId,
//         title: createJobDto.title,
//         subtitle: createJobDto.subtitle,
//         jobType: createJobDto.jobType,
//         category: createJobDto.category,
//         requirements: createJobDto.requirements,
//         technicalRequirements: createJobDto.technicalRequirements || [],
//         description: createJobDto.description,
//         salary: {
//           range: {
//             min: createJobDto.salaryMin,
//             max: createJobDto.salaryMax,
//           },
//           currency: createJobDto.salaryCurrency || 'USD',
//           period: createJobDto.salaryPeriod || 'yearly',
//           isNegotiable: createJobDto.salaryNegotiable ?? true,
//         },
//         location: {
//           type: createJobDto.locationType,
//           country: createJobDto.locationCountry || '',
//           city: createJobDto.locationCity || '',
//           address: createJobDto.locationAddress || '',
//         },
//         applicationDeadline: createJobDto.applicationDeadline,
//         experienceLevel: createJobDto.experienceLevel,
//         benefits: createJobDto.benefits || [],
//         poster: posterUrl,
//         status: 'open',
//         applicationCount: 0,
//         views: 0,
//         isPromoted: false,
//         applicationsEnabled: true,
//       };

//       const job = new this.jobModel(jobData);
//       const savedJob = await job.save();

//       this.logger.log('Job created successfully:', savedJob._id);
//       return savedJob;
//     } catch (error) {
//       this.logger.error('Failed to create job:', error);

//       if (error.code === 11000) {
//         throw new BadRequestException(
//           'A job with these details already exists',
//         );
//       }

//       if (error instanceof BadRequestException) {
//         throw error;
//       }

//       throw new InternalServerErrorException('Failed to create job');
//     }
//   }

//   async getEmployerJobs(employerId: string): Promise<Job[]> {
//     try {
//       return await this.jobModel
//         .find({ employer: employerId })
//         .sort({ createdAt: -1 })
//         .exec();
//     } catch (error) {
//       this.logger.error(
//         `Failed to get employer jobs for ${employerId}:`,
//         error,
//       );
//       throw new InternalServerErrorException('Failed to fetch employer jobs');
//     }
//   }

//   async getCompanyJobs(companyId: string): Promise<Job[]> {
//     try {
//       return await this.jobModel
//         .find({ company: companyId })
//         .sort({ createdAt: -1 })
//         .exec();
//     } catch (error) {
//       this.logger.error(`Failed to get company jobs for ${companyId}:`, error);
//       throw new InternalServerErrorException('Failed to fetch company jobs');
//     }
//   }

//   async incrementJobViews(jobId: string): Promise<void> {
//     try {
//       await this.jobModel.findByIdAndUpdate(jobId, { $inc: { views: 1 } });
//     } catch (error) {
//       this.logger.error(`Failed to increment views for job ${jobId}:`, error);
//     }
//   }

//   // Add these methods to your JobsService class

//   async getEmployerJobsStats(employerId: string) {
//     try {
//       const stats = await this.jobModel.aggregate([
//         {
//           $match: {
//             employer: new Types.ObjectId(employerId), // Convert string ID to ObjectId
//           },
//         },
//         {
//           $group: {
//             _id: '$status',
//             count: { $sum: 1 },
//             totalViews: { $sum: '$views' },
//             totalApplications: { $sum: '$applicationCount' },
//           },
//         },
//       ]);

//       // Add debug log to see what's coming from the database
//       console.log('Raw stats from database:', stats);

//       const formattedStats = {
//         total: 0,
//         open: 0,
//         closed: 0,
//         draft: 0,
//         archived: 0,
//         totalViews: 0,
//         totalApplications: 0,
//       };

//       stats.forEach((stat) => {
//         formattedStats[stat._id] = stat.count;
//         formattedStats.total += stat.count;
//         formattedStats.totalViews += stat.totalViews;
//         formattedStats.totalApplications += stat.totalApplications;
//       });

//       // Add debug log for formatted stats
//       console.log('Formatted stats:', formattedStats);

//       return formattedStats;
//     } catch (error) {
//       this.logger.error(
//         `Failed to get employer stats for ${employerId}:`,
//         error,
//       );
//       throw new InternalServerErrorException('Failed to fetch employer stats');
//     }
//   }

//   async updateJobStatus(
//     jobId: string,
//     employerId: string,
//     status: 'open' | 'closed' | 'draft' | 'archived',
//   ) {
//     try {
//       // First check if the job exists and belongs to the employer
//       const job = await this.jobModel.findOne({
//         _id: jobId,
//         employer: employerId,
//       });

//       if (!job) {
//         throw new BadRequestException('Job not found or unauthorized');
//       }

//       // Prepare update object
//       const updateData: any = { status };

//       // If status is closed or archived, disable applications
//       if (status === 'closed' || status === 'archived') {
//         updateData.applicationsEnabled = false;
//       }

//       // Use updateOne with validateBeforeSave: false to bypass schema validation
//       await this.jobModel.updateOne(
//         { _id: jobId },
//         { $set: updateData },
//         { validateBeforeSave: false },
//       );

//       // Return the updated job
//       return await this.jobModel.findById(jobId);
//     } catch (error) {
//       this.logger.error(`Failed to update job status ${jobId}:`, error);
//       throw error;
//     }
//   }

//   async getRecentJobsActivity(employerId: string) {
//     try {
//       const thirtyDaysAgo = new Date();
//       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

//       return await this.jobModel
//         .find({
//           employer: employerId,
//           $or: [
//             { createdAt: { $gte: thirtyDaysAgo } },
//             { updatedAt: { $gte: thirtyDaysAgo } },
//             { status: 'open' },
//           ],
//         })
//         .select('title status views applicationCount createdAt updatedAt')
//         .sort({ updatedAt: -1 })
//         .limit(10);
//     } catch (error) {
//       this.logger.error(
//         `Failed to get recent jobs activity for ${employerId}:`,
//         error,
//       );
//       throw new InternalServerErrorException('Failed to fetch recent activity');
//     }
//   }

//   async duplicateJob(jobId: string, employerId: string): Promise<Job> {
//     try {
//       const originalJob = await this.jobModel.findOne({
//         _id: jobId,
//         employer: employerId,
//       });

//       if (!originalJob) {
//         throw new BadRequestException('Job not found or unauthorized');
//       }

//       // Use Partial<Job> to indicate that some properties might be removed
//       const newJobData = originalJob.toObject() as Partial<Job>;
//       delete newJobData._id;
//       delete newJobData.createdAt;
//       delete newJobData.updatedAt;

//       // Modify some fields for the duplicate
//       newJobData.title = `${newJobData.title} (Copy)`;
//       newJobData.status = 'draft';
//       newJobData.views = 0;
//       newJobData.applicationCount = 0;
//       newJobData.applicationsEnabled = false;

//       const newJob = new this.jobModel(newJobData);
//       return await newJob.save();
//     } catch (error) {
//       this.logger.error(`Failed to duplicate job ${jobId}:`, error);
//       throw error;
//     }
//   }

//   // async getActiveJobs(page = 1, limit = 10): Promise<JobResponseDto> {
//   //   try {
//   //     const currentDate = new Date();

//   //     const query = {
//   //       status: 'open',
//   //       applicationDeadline: { $gt: currentDate },
//   //       applicationsEnabled: true,
//   //     };

//   //     const [jobs, total] = await Promise.all([
//   //       this.jobModel
//   //         .find(query)
//   //         .populate('company', 'name logo')
//   //         .sort({ createdAt: -1 })
//   //         .skip((page - 1) * limit)
//   //         .limit(limit)
//   //         .exec(),
//   //       this.jobModel.countDocuments(query),
//   //     ]);

//   //     return {
//   //       jobs,
//   //       total,
//   //       currentPage: page,
//   //       totalPages: Math.ceil(total / limit),
//   //       hasMore: page < Math.ceil(total / limit),
//   //     };
//   //   } catch (error) {
//   //     this.logger.error('Failed to fetch active jobs:', error);
//   //     throw new InternalServerErrorException('Failed to fetch active jobs');
//   //   }
//   // }

//   // In your jobs.service.ts
//   async getActiveJobs(
//     page: number = 1,
//     limit: number = 10,
//   ): Promise<PaginatedJobsResponse> {
//     try {
//       const query = { status: 'open' };
//       const skip = (page - 1) * limit;

//       const [jobs, total] = await Promise.all([
//         this.jobModel
//           .find(query)
//           // .populate('company', 'name logo website industry') // Make this optional
//           .select('-company') // Temporarily exclude company field

//           .sort({ createdAt: -1 })
//           .skip(skip)
//           .limit(limit)
//           .lean(),
//         this.jobModel.countDocuments(query),
//       ]);

//       // Transform the jobs to include company info either from reference or inline data
//       const transformedJobs = jobs.map((job) => ({
//         ...job,
//         company: job.company || {
//           name: 'Company Name Not Available',
//           logo: '/company-placeholder.png',
//           website: null,
//           industry: 'Not Specified',
//         },
//       }));

//       return {
//         jobs: transformedJobs,
//         total,
//         currentPage: page,
//         totalPages: Math.ceil(total / limit),
//         hasMore: page * limit < total,
//       };
//     } catch (error) {
//       this.logger.error('Failed to fetch active jobs:', error);
//       throw new InternalServerErrorException('Failed to fetch active jobs');
//     }
//   }

//   async searchJobs(searchJobsDto: SearchJobsDto): Promise<JobResponseDto> {
//     try {
//       const {
//         search,
//         jobTypes,
//         categories,
//         locationTypes,
//         country,
//         city,
//         experienceLevels,
//         salaryMin,
//         salaryMax,
//         salaryCurrency,
//         salaryPeriod,
//         page = 1,
//         limit = 10,
//       } = searchJobsDto;

//       const currentDate = new Date();

//       // Base query
//       const query: any = {
//         status: 'open',
//         applicationDeadline: { $gt: currentDate },
//         applicationsEnabled: true,
//       };

//       // Add text search if provided
//       if (search) {
//         query.$or = [
//           { title: { $regex: search, $options: 'i' } },
//           { subtitle: { $regex: search, $options: 'i' } },
//           { description: { $regex: search, $options: 'i' } },
//         ];
//       }

//       // Add filters only if they are provided
//       if (jobTypes?.length) {
//         query.jobType = { $in: jobTypes };
//       }

//       if (categories?.length) {
//         query.category = { $in: categories };
//       }

//       if (locationTypes?.length) {
//         query['location.type'] = { $in: locationTypes };
//       }

//       if (country) {
//         query['location.country'] = country;
//       }

//       if (city) {
//         query['location.city'] = city;
//       }

//       if (experienceLevels?.length) {
//         query.experienceLevel = { $in: experienceLevels };
//       }

//       // Salary filters
//       if (salaryMin || salaryMax || salaryCurrency || salaryPeriod) {
//         if (salaryMin) {
//           query['salary.range.min'] = { $gte: salaryMin };
//         }
//         if (salaryMax) {
//           query['salary.range.max'] = { $lte: salaryMax };
//         }
//         if (salaryCurrency) {
//           query['salary.currency'] = salaryCurrency;
//         }
//         if (salaryPeriod) {
//           query['salary.period'] = salaryPeriod;
//         }
//       }

//       console.log('Search query:', JSON.stringify(query, null, 2));

//       const [jobs, total] = await Promise.all([
//         this.jobModel
//           .find(query)
//           .populate('company', 'name logo')
//           .sort({ createdAt: -1 })
//           .skip((page - 1) * limit)
//           .limit(limit)
//           .exec(),
//         this.jobModel.countDocuments(query),
//       ]);
//       // Log the job IDs that were found
//       console.log(
//         'Jobs found:',
//         jobs.map((job) => ({
//           id: job._id,
//           title: job.title,
//           description: job.description?.substring(0, 50) + '...', // Just show first 50 chars
//         })),
//       );

//       return {
//         jobs,
//         total,
//         currentPage: page,
//         totalPages: Math.ceil(total / limit),
//         hasMore: page < Math.ceil(total / limit),
//       };
//     } catch (error) {
//       this.logger.error('Failed to search jobs:', error);
//       throw new InternalServerErrorException('Failed to search jobs');
//     }
//   }

//   async getJobById(jobId: string): Promise<Job> {
//     try {
//       const job = await this.jobModel
//         .findById(jobId)
//         .populate('company', 'name logo description')
//         .exec();

//       if (!job) {
//         throw new BadRequestException('Job not found');
//       }

//       return job;
//     } catch (error) {
//       this.logger.error(`Failed to fetch job ${jobId}:`, error);
//       if (error instanceof BadRequestException) {
//         throw error;
//       }
//       throw new InternalServerErrorException('Failed to fetch job details');
//     }
//   }
// }

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
import { CrawledJob } from '../jobs-crawled/schema/job-crawled.schema';
import { PaginatedJobsResponse } from './interface/paginated-jobs.interface';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectModel('Job') private readonly jobModel: Model<Job>,
    @InjectModel('CrawledJob')
    private readonly crawledJobModel: Model<CrawledJob>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ==================== KEEP ALL YOUR EXISTING METHODS ====================
  // createJob, getEmployerJobs, getCompanyJobs, incrementJobViews,
  // getEmployerJobsStats, updateJobStatus, getRecentJobsActivity, duplicateJob
  // ... (I'm not repeating them here to save space, but keep them all)

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

  async getEmployerJobsStats(employerId: string) {
    try {
      const stats = await this.jobModel.aggregate([
        {
          $match: {
            employer: new Types.ObjectId(employerId),
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
      const job = await this.jobModel.findOne({
        _id: jobId,
        employer: employerId,
      });

      if (!job) {
        throw new BadRequestException('Job not found or unauthorized');
      }

      const updateData: any = { status };

      if (status === 'closed' || status === 'archived') {
        updateData.applicationsEnabled = false;
      }

      await this.jobModel.updateOne(
        { _id: jobId },
        { $set: updateData },
        { validateBeforeSave: false },
      );

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

      const newJobData = originalJob.toObject() as Partial<Job>;
      delete newJobData._id;
      delete newJobData.createdAt;
      delete newJobData.updatedAt;

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

  // ==================== UNIFIED ENDPOINTS (NEW) ====================

  /**
   * UNIFIED: Get active jobs from BOTH regular jobs AND crawled jobs
   */
  async getActiveJobs(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedJobsResponse> {
    try {
      const skip = (page - 1) * limit;

      // Query for regular jobs
      const regularJobsQuery = { status: 'open' };

      // Query for crawled jobs
      const crawledJobsQuery = {
        status: 'active',
        expirationDate: { $gt: new Date() },
      };

      // Fetch both in parallel
      const [regularJobs, crawledJobs, regularTotal, crawledTotal] =
        await Promise.all([
          this.jobModel
            .find(regularJobsQuery)
            .select('-company')
            .sort({ createdAt: -1 })
            .lean(),
          this.crawledJobModel
            .find(crawledJobsQuery)
            .sort({ 'source.fetchedAt': -1 })
            .lean(),
          this.jobModel.countDocuments(regularJobsQuery),
          this.crawledJobModel.countDocuments(crawledJobsQuery),
        ]);

      // Normalize crawled jobs to match regular job structure
      const normalizedCrawledJobs = crawledJobs.map((job) =>
        this.normalizeCrawledJob(job),
      );

      // Combine and sort by date
      const allJobs = [...regularJobs, ...normalizedCrawledJobs].sort(
        (a: any, b: any) => {
          const dateA = new Date(a.createdAt || a.postedDate).getTime();
          const dateB = new Date(b.createdAt || b.postedDate).getTime();
          return dateB - dateA;
        },
      );

      // Apply pagination to combined results
      const paginatedJobs = allJobs.slice(skip, skip + limit);
      const total = regularTotal + crawledTotal;

      // Transform jobs to include company info
      const transformedJobs = paginatedJobs.map((job: any) => ({
        ...job,
        company: job.company || {
          name: job.companyName || 'Company Name Not Available',
          logo: job.companyLogo || '/company-placeholder.png',
          website: job.companyUrl || null,
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

  /**
   * UNIFIED: Search across both regular and crawled jobs
   */
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

      // Build query for regular jobs
      const regularQuery: any = {
        status: 'open',
        applicationDeadline: { $gt: currentDate },
        applicationsEnabled: true,
      };

      // Build query for crawled jobs
      const crawledQuery: any = {
        status: 'active',
        expirationDate: { $gt: currentDate },
      };

      // Apply text search to both
      if (search) {
        const searchRegex = { $regex: search, $options: 'i' };
        regularQuery.$or = [
          { title: searchRegex },
          { subtitle: searchRegex },
          { description: searchRegex },
        ];
        crawledQuery.$or = [
          { title: searchRegex },
          { description: searchRegex },
          { 'company.name': searchRegex },
        ];
      }

      // Apply filters
      if (jobTypes?.length) {
        regularQuery.jobType = { $in: jobTypes };
        crawledQuery.jobType = { $in: jobTypes };
      }

      if (categories?.length) {
        regularQuery.category = { $in: categories };
        crawledQuery.category = { $in: categories };
      }

      if (locationTypes?.length) {
        regularQuery['location.type'] = { $in: locationTypes };
        crawledQuery['location.type'] = { $in: locationTypes };
      }

      if (country) {
        regularQuery['location.country'] = country;
        crawledQuery['location.country'] = country;
      }

      if (city) {
        regularQuery['location.city'] = city;
        crawledQuery['location.city'] = city;
      }

      if (experienceLevels?.length) {
        regularQuery.experienceLevel = { $in: experienceLevels };
        crawledQuery.experienceLevel = { $in: experienceLevels };
      }

      // Salary filters (note the different structures)
      if (salaryMin || salaryMax || salaryCurrency || salaryPeriod) {
        if (salaryMin) {
          regularQuery['salary.range.min'] = { $gte: salaryMin };
          crawledQuery['salary.min'] = { $gte: salaryMin };
        }
        if (salaryMax) {
          regularQuery['salary.range.max'] = { $lte: salaryMax };
          crawledQuery['salary.max'] = { $lte: salaryMax };
        }
        if (salaryCurrency) {
          regularQuery['salary.currency'] = salaryCurrency;
          crawledQuery['salary.currency'] = salaryCurrency;
        }
        if (salaryPeriod) {
          regularQuery['salary.period'] = salaryPeriod;
          crawledQuery['salary.period'] = salaryPeriod;
        }
      }

      this.logger.log(
        'Regular jobs query:',
        JSON.stringify(regularQuery, null, 2),
      );
      this.logger.log(
        'Crawled jobs query:',
        JSON.stringify(crawledQuery, null, 2),
      );

      // Fetch from both sources
      const [regularJobs, crawledJobs, regularTotal, crawledTotal] =
        await Promise.all([
          this.jobModel
            .find(regularQuery)
            .populate('company', 'name logo')
            .sort({ createdAt: -1 })
            .lean()
            .exec(),
          this.crawledJobModel
            .find(crawledQuery)
            .sort({ 'source.fetchedAt': -1 })
            .lean()
            .exec(),
          this.jobModel.countDocuments(regularQuery),
          this.crawledJobModel.countDocuments(crawledQuery),
        ]);

      this.logger.log(
        `Found ${regularJobs.length} regular jobs and ${crawledJobs.length} crawled jobs`,
      );

      // Normalize and combine
      const normalizedCrawledJobs = crawledJobs.map((job) =>
        this.normalizeCrawledJob(job),
      );
      const allJobs = [...regularJobs, ...normalizedCrawledJobs].sort(
        (a: any, b: any) => {
          const dateA = new Date(a.createdAt || a.postedDate).getTime();
          const dateB = new Date(b.createdAt || b.postedDate).getTime();
          return dateB - dateA;
        },
      );

      // Apply pagination
      const skip = (page - 1) * limit;
      const paginatedJobs = allJobs.slice(skip, skip + limit);
      const total = regularTotal + crawledTotal;

      return {
        jobs: paginatedJobs,
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

  /**
   * UNIFIED: Get job by ID from either source
   */
  async getJobById(jobId: string): Promise<any> {
    try {
      // Try regular jobs first
      let job = await this.jobModel
        .findById(jobId)
        .populate('company', 'name logo description')
        .lean()
        .exec();

      if (job) {
        return {
          ...job,
          isCrawled: false,
          canApply: true,
        };
      }

      // If not found, try crawled jobs
      const crawledJob = await this.crawledJobModel
        .findById(jobId)
        .lean()
        .exec();

      if (crawledJob) {
        return {
          ...this.normalizeCrawledJob(crawledJob),
          isCrawled: true,
          canApply: false, // Users need to apply via external link
        };
      }

      throw new BadRequestException('Job not found');
    } catch (error) {
      this.logger.error(`Failed to fetch job ${jobId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch job details');
    }
  }

  // ==================== HELPER METHOD ====================

  /**
   * Normalize crawled job to match regular job structure
   */
  private normalizeCrawledJob(crawledJob: any): any {
    return {
      _id: crawledJob._id,
      title: crawledJob.title,
      subtitle: crawledJob.description?.substring(0, 100) || '',
      description: crawledJob.description,
      jobType: crawledJob.jobType || 'full-time',
      category: crawledJob.category || 'other',

      // Location mapping (crawled jobs already have correct structure)
      location: {
        type: crawledJob.location?.type || 'on-site',
        country: crawledJob.location?.country || '',
        city: crawledJob.location?.city || '',
        address: crawledJob.location?.address || '',
      },

      // Salary mapping (different structure)
      salary: {
        range: {
          min: crawledJob.salary?.min || 0,
          max: crawledJob.salary?.max || 0,
        },
        currency: crawledJob.salary?.currency || 'USD',
        period: crawledJob.salary?.period || 'yearly',
        isNegotiable: false,
      },

      // Company info
      companyName: crawledJob.company?.name || 'Unknown Company',
      companyLogo: crawledJob.company?.logo || '',
      companyUrl: crawledJob.company?.website || '',

      // Source tracking - IMPORTANT for frontend
      isCrawled: true,
      source: crawledJob.source?.platform || 'external',
      externalUrl: crawledJob.applyUrl,

      // Metadata
      createdAt: crawledJob.postedDate || crawledJob.createdAt,
      postedDate: crawledJob.postedDate,
      views: crawledJob.views || 0,
      applicationCount: 0, // Crawled jobs don't track this
      status: 'open',

      // Additional fields
      requirements: crawledJob.requirements || [],
      technicalRequirements: crawledJob.tags || [],
      benefits: [],
      experienceLevel: crawledJob.experienceLevel || 'any',
      tags: crawledJob.tags || [],
    };
  }
}
