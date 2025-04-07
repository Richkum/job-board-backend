import { Type } from 'class-transformer';
import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsEnum,
  ValidateNested,
  MinLength,
  IsUrl,
  IsDate,
  IsNotEmpty,
  Min,
  IsObject,
  Matches,
} from 'class-validator';

// Portfolio Link DTO
export class PortfolioLinkDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsUrl()
  url: string;

  @IsString()
  @IsOptional()
  description?: string;
}

// Expected Salary DTO
export class ExpectedSalaryDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(['USD', 'EUR', 'GBP', 'FCFA'])
  currency: string = 'USD';

  @IsEnum(['hourly', 'monthly', 'yearly'])
  period: 'hourly' | 'monthly' | 'yearly' = 'yearly';
}

// Resume Info DTO
export class ResumeInfoDto {
  @IsEnum(['link', 'text', 'file'])
  format: 'link' | 'text' | 'file';

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(['linkedin', 'github', 'drive', 'dropbox', 'other', null])
  @IsOptional()
  source?: 'linkedin' | 'github' | 'drive' | 'dropbox' | 'other' | null;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsString()
  @IsOptional()
  mimeType?: string;
}

// Additional Material DTO
export class AdditionalMaterialDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(['link', 'certificate', 'portfolio', 'project', 'other'])
  type: 'link' | 'certificate' | 'portfolio' | 'project' | 'other';

  @IsString()
  @IsUrl()
  url: string;

  @IsString()
  @IsOptional()
  description?: string;
}

// Professional Profiles DTO
export class ProfessionalProfilesDto {
  @IsOptional()
  @IsUrl()
  @Matches(/linkedin\.com\//, {
    message: 'Must be a valid LinkedIn URL',
  })
  linkedin?: string;

  @IsOptional()
  @IsUrl()
  @Matches(/github\.com\//, {
    message: 'Must be a valid GitHub URL',
  })
  github?: string;

  @IsOptional()
  @IsUrl()
  website?: string;
}

// Create Application DTO
export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  jobId: string;

  @IsString()
  @MinLength(100, {
    message: 'Cover letter must be at least 100 characters long',
  })
  coverLetter: string;

  @ValidateNested()
  @Type(() => ResumeInfoDto)
  resumeInfo: ResumeInfoDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PortfolioLinkDto)
  portfolio?: {
    links: PortfolioLinkDto[];
  };

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  relevantExperience?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ExpectedSalaryDto)
  expectedSalary?: ExpectedSalaryDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AdditionalMaterialDto)
  additionalMaterials?: AdditionalMaterialDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ProfessionalProfilesDto)
  professionalProfiles?: ProfessionalProfilesDto;

  @IsString()
  @IsOptional()
  notes?: string;
}

// Update Application DTO
export class UpdateApplicationStatusDto {
  @IsEnum(['reviewing', 'accepted', 'rejected'])
  status: 'reviewing' | 'accepted' | 'rejected';

  @IsString()
  @IsOptional()
  reviewNotes?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  interviewDate?: Date;
}

// Withdraw Application DTO
export class WithdrawApplicationDto {
  @IsString()
  @MinLength(10, {
    message: 'Withdrawal reason must be at least 10 characters long',
  })
  withdrawalReason: string;
}

// Query Filters DTO
export class ApplicationFilterDto {
  @IsEnum(['pending', 'reviewing', 'accepted', 'rejected', 'withdrawn'])
  @IsOptional()
  status?: 'pending' | 'reviewing' | 'accepted' | 'rejected' | 'withdrawn';

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  order?: 'asc' | 'desc' = 'desc';
}

// Response DTO
export class ApplicationResponseDto {
  id: string;
  job: {
    id: string;
    title: string;
    company: string;
  };
  applicant: {
    id: string;
    name: string;
    email: string;
  };
  status: string;
  coverLetter: string;
  resumeInfo: {
    format: 'link' | 'text' | 'file';
    content: string;
    source?: 'linkedin' | 'github' | 'drive' | 'dropbox' | 'other' | null;
    fileName?: string;
    mimeType?: string;
  };
  portfolio?: {
    links: {
      title: string;
      url: string;
      description?: string;
    }[];
  };
  relevantExperience?: string[];
  expectedSalary?: {
    amount: number;
    currency: string;
    period: string;
  };
  additionalMaterials?: {
    title: string;
    type: 'link' | 'certificate' | 'portfolio' | 'project' | 'other';
    url: string;
    description?: string;
  }[];
  professionalProfiles?: {
    linkedin?: string;
    github?: string;
    website?: string;
  };
  notes?: string;
  reviewNotes?: string;
  interviewDate?: Date;
  withdrawalReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Paginated Response DTO
export class PaginatedApplicationsResponseDto {
  data: ApplicationResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
