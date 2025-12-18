import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobSchema } from './schema/job.schema';
import { CrawledJobSchema } from '../jobs-crawled/schema/job-crawled.schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { JobsController } from './jobs.controllers';
import { JobsService } from './jobs.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Job', schema: JobSchema },
      { name: 'CrawledJob', schema: CrawledJobSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
