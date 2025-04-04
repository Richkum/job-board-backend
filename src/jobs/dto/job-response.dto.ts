import { Job } from '../schema/job.schema';

export class JobResponseDto {
  jobs: Job[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}
