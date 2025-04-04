import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsService } from './jobs.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { AuthModule } from '../auth/auth.module'; // For JWT Guard
import { JobsController } from './jobs.controllers';
import { JobSchema } from './schema/job.schema';
import { CompanyModule } from 'src/company/company.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Job', schema: JobSchema }]),
    CloudinaryModule,
    AuthModule,

    // Importing CompanyModule if you need to use it in JobsService
    CompanyModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService], // Export if needed by other modules
})
export class JobsModule {}
