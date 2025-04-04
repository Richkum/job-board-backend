import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { ApplicationSchema } from './schema/application.schema';
import { JobSchema } from '../jobs/schema/job.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Application', schema: ApplicationSchema },
      { name: 'Job', schema: JobSchema },
    ]),
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
