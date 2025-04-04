import { Job } from '../schema/job.schema';

export interface PaginatedJobsResponse {
  jobs: Job[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}
