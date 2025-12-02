// import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { JobsService } from './jobs.service';
// import { CloudinaryModule } from '../cloudinary/cloudinary.module';
// import { AuthModule } from '../auth/auth.module';
// import { JobsController } from './jobs.controllers';
// import { JobSchema } from './schema/job.schema';
// import { CompanyModule } from 'src/company/company.module';

// @Module({
//   imports: [
//     MongooseModule.forFeature([{ name: 'Job', schema: JobSchema }]),
//     CloudinaryModule,
//     AuthModule,

//     // Importing CompanyModule if you need to use it in JobsService
//     CompanyModule,
//   ],
//   controllers: [JobsController],
//   providers: [JobsService],
//   exports: [JobsService], // Export if needed by other modules
// })
// export class JobsModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobSchema } from './schema/job.schema';
import { CrawledJobSchema } from '../jobs-crawled/schema/job-crawled.schema'; // Import crawled schema
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { JobsController } from './jobs.controllers';
import { JobsService } from './jobs.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Job', schema: JobSchema },
      { name: 'CrawledJob', schema: CrawledJobSchema }, // Add this line
    ]),
    CloudinaryModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
