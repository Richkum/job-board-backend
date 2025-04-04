import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsEnum,
  Min,
  Max,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchJobsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(['full-time', 'part-time', 'contract', 'freelance', 'internship'], {
    each: true,
  })
  jobTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(
    [
      'programming',
      'design',
      'marketing',
      'sales',
      'customer-service',
      'general-labor',
      'administrative',
      'other',
    ],
    { each: true },
  )
  categories?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(['remote', 'on-site', 'hybrid'], { each: true })
  locationTypes?: string[];

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(['entry', 'junior', 'mid', 'senior', 'lead', 'any'], { each: true })
  experienceLevels?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  salaryMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  salaryMax?: number;

  @IsOptional()
  @IsEnum(['USD', 'EUR', 'GBP', 'FCFA', 'NGN', 'GHC'])
  salaryCurrency?: string;

  @IsOptional()
  @IsEnum(['hourly', 'monthly', 'yearly'])
  salaryPeriod?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
