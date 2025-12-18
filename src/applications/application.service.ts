import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
import { NotificationService } from 'src/notifications/notification.service';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectModel('Application')
    private applicationModel: Model<ApplicationDocument>,
    @InjectModel('Job')
    private jobModel: Model<Job>,
    private notificationService: NotificationService,
  ) {}

  async createApplication(
    createApplicationDto: CreateApplicationDto,
    userId: string,
  ): Promise<ApplicationResponseDto> {
    const job = await this.jobModel
      .findById(createApplicationDto.jobId)
      .populate('employer', 'email name');

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

    await application.populate([
      { path: 'job', select: 'title company status' },
      { path: 'applicant', select: 'name email avatar' },
    ]);

    // Create notification for employer
    await this.notificationService.create({
      recipient: job.employer,
      type: 'newApplication',
      title: 'New Job Application',
      message: `${(application.applicant as any).name} has applied for ${job.title}`,
      relatedJob: new Types.ObjectId(job._id),
      relatedApplication: application._id,
      actionUrl: `/applications/${application._id}`,
      priority: 'high',
    });

    return this.transformToDto(application);
  }

  async getMyApplications(
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

    const query: any = { applicant: new Types.ObjectId(userId) };
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

  async getAllJobsApplications(
    employerId: string,
    filters: ApplicationFilterDto,
  ): Promise<PaginatedApplicationsResponseDto> {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc',
    } = filters;

    // First get all jobs by this employer
    const jobs = await this.jobModel
      .find({ employer: employerId })
      .select('_id');
    const jobIds = jobs.map((job) => job._id);

    const query: any = { job: { $in: jobIds } };
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

  async getJobApplications(
    jobId: string,
    employerId: string,
    filters: ApplicationFilterDto,
  ): Promise<PaginatedApplicationsResponseDto> {
    const job = await this.jobModel.findById(jobId);
    if (!job || job.employer.toString() !== employerId) {
      throw new ForbiddenException('Unauthorized to view these applications');
    }

    const {
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc',
    } = filters;

    const query: any = { job: new Types.ObjectId(jobId) };
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
      .populate([
        { path: 'job', select: 'title company employer status' },
        { path: 'applicant', select: 'name email avatar' },
      ]);

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const job = application.job as any;
    if (job.employer.toString() !== employerId) {
      throw new ForbiddenException('Unauthorized to update this application');
    }

    // Update status
    application.status = updateDto.status;
    if (updateDto.reviewNotes) {
      application.reviewNotes = updateDto.reviewNotes;
    }
    if (updateDto.interviewDate) {
      application.interviewDate = updateDto.interviewDate;
    }

    await application.save();

    // Create notification for applicant
    let notificationTitle: string;
    let notificationMessage: string;
    let priority: 'low' | 'medium' | 'high' = 'medium';

    switch (updateDto.status) {
      case 'reviewing':
        notificationTitle = 'Application Under Review';
        notificationMessage = `Your application for ${job.title} is being reviewed`;
        break;
      case 'accepted':
        notificationTitle = 'Application Accepted';
        notificationMessage = `Congratulations! Your application for ${job.title} has been accepted`;
        priority = 'high';
        break;
      case 'rejected':
        notificationTitle = 'Application Status Update';
        notificationMessage = `Your application for ${job.title} was not successful`;
        break;
    }

    await this.notificationService.create({
      recipient: application.applicant._id,
      type: 'applicationStatusUpdate',
      title: notificationTitle,
      message: notificationMessage,
      relatedJob: job._id,
      relatedApplication: application._id,
      actionUrl: `/applications`,
      priority,
    });

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
      .populate([
        { path: 'job', select: 'title company employer status' },
        { path: 'applicant', select: 'name email avatar' },
      ]);

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status === 'withdrawn') {
      throw new BadRequestException('Application is already withdrawn');
    }

    application.status = 'withdrawn';
    application.withdrawalReason = withdrawDto.withdrawalReason;
    await application.save();

    // Notify employer about withdrawal
    const job = application.job as any;
    await this.notificationService.create({
      recipient: job.employer,
      type: 'applicationStatusUpdate',
      title: 'Application Withdrawn',
      message: `${(application.applicant as any).name} has withdrawn their application for ${job.title}`,
      relatedJob: job._id,
      relatedApplication: application._id,
      actionUrl: `/applications`,
      priority: 'medium',
    });

    return this.transformToDto(application);
  }

  async getApplicationById(
    applicationId: string,
    userId: string,
    userRole: string,
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate([
        { path: 'job', select: 'title company employer status' },
        { path: 'applicant', select: 'name email avatar' },
      ]);

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const job = application.job as any;
    const isApplicant = application.applicant._id.toString() === userId;
    const isEmployer = job.employer.toString() === userId;

    if (!isApplicant && !isEmployer) {
      throw new ForbiddenException('Unauthorized to view this application');
    }

    return this.transformToDto(application);
  }

  private transformToDto(
    application: ApplicationDocument,
  ): ApplicationResponseDto {
    const job = application.job as any;
    const applicant = application.applicant as any;

    return {
      id: application._id.toString(),
      job: {
        id: job._id.toString(),
        title: job.title,
        company: job.company,
      },
      applicant: {
        id: applicant._id.toString(),
        name: applicant.name,
        email: applicant.email,
      },
      status: application.status,
      coverLetter: application.coverLetter,
      resumeInfo: application.resumeInfo,
      portfolio: application.portfolio,
      relevantExperience: application.relevantExperience,
      expectedSalary: application.expectedSalary,
      additionalMaterials: application.additionalMaterials,
      professionalProfiles: application.professionalProfiles,
      notes: application.notes,
      reviewNotes: application.reviewNotes,
      interviewDate: application.interviewDate ?? undefined,
      withdrawalReason: application.withdrawalReason,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    };
  }
}
