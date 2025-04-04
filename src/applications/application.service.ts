import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from './schema/application.schema';
import { Job } from '../jobs/schema/job.schema';
import {
  CreateApplicationDto,
  UpdateApplicationStatusDto,
  WithdrawApplicationDto,
  ApplicationFilterDto,
  PaginatedApplicationsResponseDto,
  ApplicationResponseDto,
} from './dto/application.dto';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectModel('Application')
    private applicationModel: Model<ApplicationDocument>,
    @InjectModel('Job') private jobModel: Model<Job>,
  ) {}

  async createApplication(
    createApplicationDto: CreateApplicationDto,
    userId: string,
  ): Promise<ApplicationResponseDto> {
    const job = await this.jobModel.findById(createApplicationDto.jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (!job.applicationsEnabled || job.status !== 'open') {
      throw new BadRequestException('This job is not accepting applications');
    }

    const existingApplication = await this.applicationModel.findOne({
      job: createApplicationDto.jobId,
      applicant: userId,
    });

    if (existingApplication) {
      throw new BadRequestException('You have already applied for this job');
    }

    const application = await this.applicationModel.create({
      ...createApplicationDto,
      job: createApplicationDto.jobId,
      applicant: userId,
    });

    // Populate the required fields before transformation
    await application.populate([
      { path: 'job', select: 'title company status' },
      { path: 'applicant', select: 'name email avatar' },
    ]);

    return this.transformToDto(application);
  }

  // Helper method to transform Application document to DTO
  private transformToDto(
    application: ApplicationDocument,
  ): ApplicationResponseDto {
    const populatedJob = application.job as any; // Using any temporarily for populated fields
    const populatedApplicant = application.applicant as any;

    return {
      id: application._id.toString(),
      job: {
        id: populatedJob._id?.toString(),
        title: populatedJob.title || '',
        company: populatedJob.company || '',
      },
      applicant: {
        id: populatedApplicant._id?.toString(),
        name: populatedApplicant.name || '',
        email: populatedApplicant.email || '',
      },
      status: application.status,
      coverLetter: application.coverLetter,
      resume: application.resume,
      portfolio: application.portfolio,
      relevantExperience: application.relevantExperience,
      expectedSalary: application.expectedSalary,
      additionalDocuments: application.additionalDocuments,
      notes: application.notes,
      reviewNotes: application.reviewNotes,
      interviewDate: application.interviewDate || undefined,
      withdrawalReason: application.withdrawalReason,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }

  async getUserApplications(
    userId: string,
    filters: ApplicationFilterDto,
  ): Promise<PaginatedApplicationsResponseDto> {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc',
    } = filters;

    const query: any = { applicant: userId };
    if (status) {
      query.status = status;
    }

    const [applications, total] = await Promise.all([
      this.applicationModel
        .find(query)
        .populate('job', 'title company status')
        .populate('applicant', 'name email avatar')
        .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.applicationModel.countDocuments(query),
    ]);

    return {
      data: applications.map((app) => this.transformToDto(app)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateApplicationStatus(
    applicationId: string,
    employerId: string,
    updateDto: UpdateApplicationStatusDto,
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('job')
      .populate('applicant');

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const job = await this.jobModel.findById(application.job);
    if (!job || job.employer.toString() !== employerId) {
      throw new ForbiddenException('Unauthorized to update this application');
    }

    application.status = updateDto.status;
    if (updateDto.reviewNotes) {
      application.reviewNotes = updateDto.reviewNotes;
    }
    if (updateDto.interviewDate) {
      application.interviewDate = updateDto.interviewDate;
    }

    await application.save();
    return this.transformToDto(application);
  }

  async withdrawApplication(
    applicationId: string,
    userId: string,
    withdrawDto: WithdrawApplicationDto,
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationModel
      .findOne({
        _id: applicationId,
        applicant: userId,
      })
      .populate('job')
      .populate('applicant');

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status === 'withdrawn') {
      throw new BadRequestException('Application is already withdrawn');
    }

    application.status = 'withdrawn';
    application.withdrawalReason = withdrawDto.withdrawalReason;
    await application.save();

    return this.transformToDto(application);
  }

  async getApplicationById(
    applicationId: string,
    userId: string,
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('job')
      .populate('applicant');

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const job = await this.jobModel.findById(application.job);
    if (!job) {
      throw new NotFoundException('Associated job not found');
    }

    const isApplicant = application.applicant._id.toString() === userId;
    const isEmployer = job.employer.toString() === userId;

    if (!isApplicant && !isEmployer) {
      throw new ForbiddenException('Unauthorized to view this application');
    }

    return this.transformToDto(application);
  }
}
