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
import { JwtAuthGuard } from 'src/auth/gaurd/jwt-auth.guard';
import { JobsCrawledService } from './jobs-crawled.service';

@Controller('jobs-crawled')
export class JobsCrawledController {
  constructor(private readonly jobsCrawledService: JobsCrawledService) {}

  @Get('test-fetch')
  async testFetch() {
    const results = await this.jobsCrawledService.fetchAllJobs();
    return {
      message: 'Test fetch completed!',
      results,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('fetch-adzuna')
  async fetchAdzuna(@Query('query') query: string = 'software developer') {
    const count = await this.jobsCrawledService.fetchAdzunaJobs(query);
    return {
      message: 'Adzuna fetch completed',
      jobsProcessed: count,
      queryUsed: query,
    };
  }

  @Get('fetch-remoteok')
  async fetchRemoteOk() {
    const count = await this.jobsCrawledService.fetchRemoteOkJobs();
    return {
      message: 'RemoteOK fetch completed',
      jobsProcessed: count,
    };
  }

  @Get('list')
  async listJobs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.jobsCrawledService.findAllActive(page, limit);
  }

  // @Get('test-apis')
  // async testApis() {
  //   return this.jobsCrawledService.testApis();
  // }

  @Post('clear')
  async clearJobs() {
    const count = await this.jobsCrawledService.clearAllCrawledJobs();
    return {
      message: 'Crawled jobs cleared',
      jobsDeleted: count,
    };
  }
}
