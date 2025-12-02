import { Module } from '@nestjs/common';
import { JobsCrawledService } from './jobs-crawled.service';
import { JobsCrawledController } from './jobs-crawled.controller';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CompanyModule } from 'src/company/company.module';
import { CrawledJobSchema } from './schema/job-crawled.schema';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: 'CrawledJob', schema: CrawledJobSchema },
    ]),
    AuthModule,
    HttpModule,
    ScheduleModule.forRoot(),

    // Importing CompanyModule if you need to use it in JobsService
    CompanyModule,
  ],
  providers: [JobsCrawledService],
  controllers: [JobsCrawledController],
  exports: [JobsCrawledService],
})
export class JobsCrawledModule {
  constructor() {
    console.log('JobsCrawledModule loaded!');
  }
}
