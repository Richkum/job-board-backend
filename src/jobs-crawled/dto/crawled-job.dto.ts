// src/jobs-crawled/dto/crawled-job.dto.ts
export class CreateCrawledJobDto {
  title: string;
  company: {
    name: string;
    logo?: string;
    website?: string;
  };
  description: string;
  applyUrl: string;
  source: {
    platform: string;
    externalId: string;
    originalUrl?: string;
  };
  location: {
    type: string;
    country: string;
    city: string;
    address: string;
    display_name: string;
  };
  salary: {
    min: number;
    max: number;
    currency: string;
    period: string;
    isDisclosed: boolean;
  };
  jobType: string;
  category: string;
  requirements: string[];
  experienceLevel: string;
  tags: string[];
  postedDate: Date;
  expirationDate: Date;
  processingStatus: string;
  rawData: any;
}

// src/jobs-crawled/dto/adzuna-response.dto.ts
export class AdzunaJobResponseDto {
  id: string;
  title: string;
  description: string;
  created: string;
  company: {
    display_name: string;
    logo: string;
    website: string;
  };
  redirect_url: string;
  location: {
    display_name: string;
    area: string[];
  };
  salary_min?: number;
  salary_max?: number;
}

// src/jobs-crawled/dto/remoteok-response.dto.ts
export class RemoteOkJobResponseDto {
  id: string;
  position: string;
  description: string;
  company: string;
  url: string;
  tags: string[];
  location: string;
  // ... other RemoteOK fields
}
