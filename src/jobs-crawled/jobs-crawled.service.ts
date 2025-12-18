import {
  Injectable,
  BadRequestException,
  Logger,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CrawledJob } from './schema/job-crawled.schema';
import {
  CreateCrawledJobDto,
  AdzunaJobResponseDto,
  RemoteOkJobResponseDto,
} from './dto/crawled-job.dto';

@Injectable()
export class JobsCrawledService {
  private readonly logger = new Logger(JobsCrawledService.name);

  constructor(
    @InjectModel('CrawledJob') private readonly jobModel: Model<CrawledJob>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== CORE DATABASE METHODS ====================

  /**
   * Create or update a crawled job
   */
  async createOrUpdate(jobDto: CreateCrawledJobDto): Promise<CrawledJob> {
    try {
      // Check if job already exists
      const existingJob = await this.jobModel.findOne({
        'source.platform': jobDto.source.platform,
        'source.externalId': jobDto.source.externalId,
      });

      if (existingJob) {
        // Update existing job
        existingJob.set({
          ...jobDto,
          'source.lastVerified': new Date(),
          updatedAt: new Date(),
        });
        return await existingJob.save();
      }

      // Create new job
      const newJob = new this.jobModel({
        ...jobDto,
        'source.fetchedAt': new Date(),
        'source.lastVerified': new Date(),
      });
      return await newJob.save();
    } catch (error) {
      this.logger.error(
        `Error creating/updating job: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to save job');
    }
  }

  /**
   * Get all active crawled jobs
   */
  async findAllActive(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    jobs: CrawledJob[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [jobs, total] = await Promise.all([
        this.jobModel
          .find({ status: 'active' })
          .sort({ 'source.fetchedAt': -1 }) // Newest first
          .skip(skip)
          .limit(limit)
          .lean(),
        this.jobModel.countDocuments({ status: 'active' }),
      ]);

      return {
        jobs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Error fetching jobs: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch jobs');
    }
  }

  /**
   * Search crawled jobs by keyword
   */
  async searchJobs(
    keyword: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ jobs: CrawledJob[]; total: number }> {
    try {
      const query = {
        status: 'active',
        $or: [
          { title: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } },
          { 'company.name': { $regex: keyword, $options: 'i' } },
          { tags: { $regex: keyword, $options: 'i' } },
        ],
      };

      const [jobs, total] = await Promise.all([
        this.jobModel
          .find(query)
          .sort({ 'source.fetchedAt': -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        this.jobModel.countDocuments(query),
      ]);

      return { jobs, total };
    } catch (error) {
      this.logger.error(`Error searching jobs: ${error.message}`);
      throw new InternalServerErrorException('Failed to search jobs');
    }
  }

  /**
   * Increment click-through count when user applies
   */
  async recordClickThrough(jobId: string): Promise<void> {
    try {
      await this.jobModel.findByIdAndUpdate(jobId, {
        $inc: { clickThroughs: 1 },
      });
    } catch (error) {
      this.logger.error(`Error recording click: ${error.message}`);
    }
  }

  /**
   * Mark expired jobs
   */
  async markExpiredJobs(): Promise<number> {
    try {
      const result = await this.jobModel.updateMany(
        {
          status: 'active',
          expirationDate: { $lt: new Date() },
        },
        {
          $set: { status: 'expired' },
        },
      );

      this.logger.log(`Marked ${result.modifiedCount} jobs as expired`);
      return result.modifiedCount;
    } catch (error) {
      this.logger.error(`Error marking expired jobs: ${error.message}`);
      return 0;
    }
  }

  // ==================== JOB FETCHING METHODS ====================

  /**
   * Fetch jobs from Adzuna API
   */ // Replace this function in your service file
  async fetchAdzunaJobs(
    jobQuery: string = 'software developer',
  ): Promise<number> {
    // Use a constant for the country code, making it easy to change
    const countryCode = 'us';

    const appId = '716b0ec9';
    const appKey = '187580f3068a047bcc9543568efca6da';

    // --- 1. PRE-CHECK & SETUP ---
    if (!appId || !appKey) {
      throw new BadRequestException('Adzuna API credentials not configured');
    }

    this.logger.log(
      `🤖 Fetching Adzuna jobs for query: ${jobQuery} (Country: ${countryCode.toUpperCase()})`,
    );

    // Define the base URL using the countryCode variable
    const apiUrl = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1`;

    // Define the common request parameters
    const requestParams = {
      app_id: appId,
      app_key: appKey,
      what: jobQuery,
      results_per_page: 25,
      max_days_old: 30,
      where: countryCode,
    };

    // Log the final request details before execution
    const safeParams = {
      ...requestParams,
      app_id: '[REDACTED]',
      app_key: '[REDACTED]',
    };
    this.logger.log(`Request Params: ${JSON.stringify(safeParams)}`);
    this.logger.log(
      `Request URL: ${apiUrl}?${new URLSearchParams(requestParams as Record<string, any>).toString().replace(appId, 'REDACTED').replace(appKey, 'REDACTED')}`,
    );

    // --- 2. API CALL EXECUTION ---
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(apiUrl, {
          params: requestParams,
          headers: {
            'User-Agent': 'JobBoardCrawler/1.0',
          },
          timeout: 15000,
          responseType: 'json',
        }),
      );

      // --- 3. RESPONSE HANDLING ---
      const jobs: AdzunaJobResponseDto[] = response.data.results || [];

      this.logger.log(`✅ Adzuna API Success (Status: ${response.status})`);
      this.logger.log(
        `Response Count: ${response.data.count || 'N/A'}. Received ${jobs.length} jobs in this batch.`,
      );

      // Check if we received any jobs
      if (jobs.length === 0) {
        this.logger.warn(
          `Received 0 jobs. Check query, country code, and date range.`,
        );
        return 0;
      }

      if (jobs.length > 0) {
        this.logger.log(
          `First job sample: ${JSON.stringify({
            id: jobs[0].id,
            title: jobs[0].title,
            company: jobs[0].company?.display_name,
          })}`,
        );
      }

      // --- 4. DATA PROCESSING AND SAVING ---
      let savedCount = 0;
      let errorCount = 0;

      for (const jobData of jobs) {
        try {
          const normalizedJob = this.normalizeAdzunaJob(jobData);
          await this.createOrUpdate(normalizedJob);
          savedCount++;
          // Log less frequently to keep logs clean
          if (savedCount % 5 === 0) {
            this.logger.log(`Processed ${savedCount}/${jobs.length} jobs...`);
          }
        } catch (jobError) {
          errorCount++;
          this.logger.error(
            `Failed to process Adzuna job ${jobData.id}: ${jobError.message}`,
            jobError.stack,
          );
        }
      }

      this.logger.log(
        `🎉 Job Processing Complete. Saved ${savedCount}/${jobs.length} jobs (${errorCount} processing errors)`,
      );
      return savedCount;
      // --- 5. CENTRALIZED ERROR HANDLING (CORRECTED) ---
    } catch (error) {
      const isAxiosError = error.isAxiosError;
      const status =
        isAxiosError && error.response ? error.response.status : 'N/A';
      const message = isAxiosError ? error.message : error.toString();

      // Corrected logic to safely access the response body
      let responseBody = 'N/A';
      if (isAxiosError && error.response?.data) {
        try {
          // Safely stringify and then get a substring
          responseBody = JSON.stringify(error.response.data).substring(0, 500);
        } catch (e) {
          // Handle cases where data is not JSON or stringify fails
          responseBody = String(error.response.data).substring(0, 500);
        }
      }

      this.logger.error(`❌ API Request Failed (Status: ${status})`, message);
      this.logger.error(`Partial Response Body: ${responseBody}`);

      // Re-throw appropriate exception for NestJS
      throw new InternalServerErrorException(`Adzuna API error: ${message}`);
    }
  }

  /**
   * Fetch jobs from RemoteOK API
   */
  async fetchRemoteOkJobs(): Promise<number> {
    try {
      this.logger.log('Fetching RemoteOK jobs...');

      const response: AxiosResponse<any[]> = await firstValueFrom(
        this.httpService.get('https://remoteok.io/api', {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Accept: 'application/json',
          },
          timeout: 10000,
        }),
      );

      // RemoteOK API returns an array where first element is sometimes metadata
      let jobs = response.data;
      if (
        Array.isArray(jobs) &&
        jobs.length > 0 &&
        typeof jobs[0] === 'object' &&
        !jobs[0].id
      ) {
        // Remove metadata object
        jobs = jobs.slice(1);
      }

      // Filter to only get valid job objects
      const validJobs = jobs.filter(
        (job) =>
          job &&
          typeof job === 'object' &&
          job.id &&
          job.position &&
          job.company,
      );

      this.logger.log(`Received ${validJobs.length} valid jobs from RemoteOK`);

      let savedCount = 0;
      // Process and save each job
      for (const jobData of validJobs) {
        try {
          const normalizedJob = this.normalizeRemoteOkJob(jobData);
          await this.createOrUpdate(normalizedJob);
          savedCount++;
        } catch (jobError) {
          this.logger.warn(
            `Failed to process RemoteOK job ${jobData.id}: ${jobError.message}`,
          );
        }
      }

      this.logger.log(
        `Successfully saved ${savedCount}/${validJobs.length} RemoteOK jobs`,
      );
      return savedCount;
    } catch (error) {
      this.logger.error(
        `Failed to fetch RemoteOK jobs: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to fetch RemoteOK jobs: ${error.message}`,
      );
    }
  }

  /**
   * Fetch jobs from all sources
   */
  async fetchAllJobs(): Promise<{
    adzuna: number;
    remoteok: number;
    total: number;
  }> {
    this.logger.log('Starting job fetch from all sources...');

    const results = {
      adzuna: 0,
      remoteok: 0,
      total: 0,
    };

    try {
      // Fetch from Adzuna
      results.adzuna = await this.fetchAdzunaJobs();

      // Wait a bit between requests to be polite
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Fetch from RemoteOK
      results.remoteok = await this.fetchRemoteOkJobs();

      results.total = results.adzuna + results.remoteok;

      // Mark expired jobs after fetching new ones
      await this.markExpiredJobs();

      this.logger.log(
        `Job fetch completed. Total new/updated: ${results.total}`,
      );
      return results;
    } catch (error) {
      this.logger.error(`Failed to fetch all jobs: ${error.message}`);
      throw error;
    }
  }

  // ==================== NORMALIZATION METHODS ====================

  /**
   * Normalize Adzuna job data to your schema
   */
  private normalizeAdzunaJob(
    adzunaData: AdzunaJobResponseDto,
  ): CreateCrawledJobDto {
    const description = adzunaData.description || '';
    const salaryMin = adzunaData.salary_min;
    const salaryMax = adzunaData.salary_max;

    return {
      title: adzunaData.title?.trim() || 'Untitled Position',
      company: {
        name: adzunaData.company?.display_name?.trim() || 'Unknown Company',
        logo: adzunaData.company?.logo || '',
        website: adzunaData.company?.website || '',
      },
      description: description,
      applyUrl:
        adzunaData.redirect_url ||
        `https://www.adzuna.com/jobs/details/${adzunaData.id}`,

      source: {
        platform: 'adzuna',
        externalId: adzunaData.id?.toString() || `adzuna-${Date.now()}`,
        originalUrl: adzunaData.redirect_url,
      },

      location: {
        type: this.determineLocationType(description),
        country: this.extractAdzunaCountry(adzunaData),
        city: this.extractAdzunaCity(adzunaData),
        address: adzunaData.location?.display_name || '',
        display_name: adzunaData.location?.display_name || '',
      },

      salary: {
        min: salaryMin ?? 0,
        max: salaryMax ?? 0,
        currency: 'USD',
        period: 'yearly',
        isDisclosed: !!(salaryMin || salaryMax),
      },

      jobType: this.determineJobType(description),
      category: this.determineCategory(description),
      requirements: this.extractRequirements(description),
      experienceLevel: this.determineExperienceLevel(description),

      postedDate: adzunaData.created
        ? new Date(adzunaData.created)
        : new Date(),
      expirationDate: this.calculateExpirationDate(adzunaData.created),

      tags: this.extractTags(description, adzunaData.title),
      processingStatus: 'processed',
      rawData: adzunaData,
    };
  }

  /**
   * Normalize RemoteOK job data to your schema
   */
  private normalizeRemoteOkJob(remoteOkData: any): CreateCrawledJobDto {
    const description = remoteOkData.description || '';
    const tags = remoteOkData.tags || [];

    return {
      title: remoteOkData.position?.trim() || 'Remote Position',
      company: {
        name: remoteOkData.company?.trim() || 'Remote Company',
        logo: remoteOkData.logo || '',
        website: remoteOkData.url || '',
      },
      description: description,
      applyUrl:
        remoteOkData.url ||
        `https://remoteok.io/remote-jobs/${remoteOkData.id}`,

      source: {
        platform: 'remoteok',
        externalId: remoteOkData.id?.toString() || `remoteok-${Date.now()}`,
        originalUrl: remoteOkData.url,
      },

      location: {
        type: 'remote',
        country: remoteOkData.location || 'Worldwide',
        city: remoteOkData.city || '',
        address: remoteOkData.address || '',
        display_name: remoteOkData.display_name || '',
      },

      salary: {
        min: remoteOkData.salary_min,
        max: remoteOkData.salary_max,
        currency: remoteOkData.currency || 'USD',
        period: 'yearly',
        isDisclosed: !!(remoteOkData.salary_min || remoteOkData.salary_max),
      },

      jobType: this.determineJobType(description),
      category: this.determineCategory(description),
      requirements: this.extractRequirements(description),
      experienceLevel: this.determineExperienceLevel(description),

      postedDate: new Date(remoteOkData.date || Date.now()),
      expirationDate: this.calculateExpirationDate(remoteOkData.date),

      tags: [...tags, ...this.extractTags(description, remoteOkData.position)],
      processingStatus: 'processed',
      rawData: remoteOkData,
    };
  }

  // ==================== HELPER METHODS ====================

  private determineLocationType(
    description: string,
  ): 'remote' | 'on-site' | 'hybrid' {
    const desc = description.toLowerCase();
    if (
      desc.includes('remote') ||
      desc.includes('work from home') ||
      desc.includes('wfh')
    ) {
      return 'remote';
    }
    if (desc.includes('hybrid')) {
      return 'hybrid';
    }
    return 'on-site';
  }

  private extractAdzunaCountry(adzunaData: AdzunaJobResponseDto): string {
    // Adzuna location.area format: ["US", "California", "San Francisco", "Market Street"]
    return adzunaData.location?.area?.[0] || 'US';
  }

  private extractAdzunaCity(adzunaData: AdzunaJobResponseDto): string {
    return (
      adzunaData.location?.area?.[2] || adzunaData.location?.area?.[1] || ''
    );
  }

  private determineJobType(description: string): string {
    const desc = description.toLowerCase();
    if (desc.includes('full-time') || desc.includes('full time'))
      return 'full-time';
    if (desc.includes('part-time') || desc.includes('part time'))
      return 'part-time';
    if (desc.includes('contract')) return 'contract';
    if (desc.includes('freelance')) return 'freelance';
    if (desc.includes('internship')) return 'internship';
    return 'full-time';
  }

  private determineCategory(description: string): string {
    const desc = description.toLowerCase();
    const categories = {
      programming: [
        'developer',
        'engineer',
        'programmer',
        'software',
        'coding',
        'python',
        'javascript',
        'java',
        'c++',
      ],
      design: ['designer', 'ui', 'ux', 'figma', 'adobe', 'photoshop'],
      marketing: ['marketing', 'seo', 'social media', 'content', 'growth'],
      sales: ['sales', 'account executive', 'business development'],
      'customer-service': ['customer service', 'support', 'help desk'],
      'general-labor': ['labor', 'construction', 'warehouse'],
      administrative: ['admin', 'assistant', 'receptionist', 'office'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => desc.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }

  private extractRequirements(description: string): string[] {
    const requirements: string[] = [];
    const desc = description.toLowerCase();

    // Simple keyword extraction
    const techKeywords = [
      'javascript',
      'typescript',
      'react',
      'angular',
      'vue',
      'node.js',
      'python',
      'java',
      'c#',
      'php',
      'ruby',
      'go',
      'rust',
      'sql',
      'mongodb',
      'postgresql',
      'aws',
      'docker',
      'kubernetes',
      'git',
      'rest api',
      'graphql',
    ];

    techKeywords.forEach((keyword) => {
      if (desc.includes(keyword)) {
        requirements.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
      }
    });

    return requirements;
  }

  private determineExperienceLevel(description: string): string {
    const desc = description.toLowerCase();
    if (
      desc.includes('senior') ||
      desc.includes('lead') ||
      desc.includes('principal')
    )
      return 'senior';
    if (
      desc.includes('mid-level') ||
      desc.includes('mid level') ||
      desc.includes('experienced')
    )
      return 'mid';
    if (
      desc.includes('junior') ||
      desc.includes('entry level') ||
      desc.includes('graduate')
    )
      return 'junior';
    if (desc.includes('entry')) return 'entry';
    return 'any';
  }

  private calculateExpirationDate(postedDate: string | Date): Date {
    const date = postedDate ? new Date(postedDate) : new Date();
    // Set expiration to 60 days from posting date
    date.setDate(date.getDate() + 60);
    return date;
  }

  private extractTags(description: string, title: string = ''): string[] {
    const tags = new Set<string>();
    const text = (title + ' ' + description).toLowerCase();

    // Common tech tags
    const commonTags = [
      'javascript',
      'typescript',
      'react',
      'angular',
      'vue',
      'nodejs',
      'express',
      'python',
      'django',
      'flask',
      'java',
      'spring',
      'c#',
      'dotnet',
      'php',
      'laravel',
      'ruby',
      'rails',
      'go',
      'rust',
      'frontend',
      'backend',
      'fullstack',
      'devops',
      'mobile',
      'web',
      'remote',
      'reactjs',
      'nextjs',
      'nestjs',
      'mongodb',
      'postgresql',
      'mysql',
      'aws',
      'azure',
      'docker',
      'kubernetes',
      'ci/cd',
      'agile',
    ];

    commonTags.forEach((tag) => {
      if (text.includes(tag.toLowerCase())) {
        tags.add(tag.toLowerCase());
      }
    });

    return Array.from(tags);
  }

  // ==================== SCHEDULED TASKS ====================

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async scheduledJobFetch() {
    this.logger.log('Running scheduled job fetch...');
    try {
      const results = await this.fetchAllJobs();
      this.logger.log(
        `Scheduled fetch completed: ${results.total} jobs processed`,
      );
    } catch (error) {
      this.logger.error(`Scheduled job fetch failed: ${error.message}`);
    }
  }

  /**
   * Check for expired jobs every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async scheduledExpiryCheck() {
    this.logger.log('Checking for expired jobs...');
    const expiredCount = await this.markExpiredJobs();
    if (expiredCount > 0) {
      this.logger.log(`Marked ${expiredCount} jobs as expired`);
    }
  }
  /**
   * Clear all crawled jobs (for testing)
   */
  async clearAllCrawledJobs(): Promise<number> {
    const result = await this.jobModel.deleteMany({});
    this.logger.log(`Cleared ${result.deletedCount} crawled jobs`);
    return result.deletedCount;
  }
}
