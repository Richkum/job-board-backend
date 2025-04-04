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
import { Transform, Type } from 'class-transformer';

export class SearchJobsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    // Convert string to array if it's not already an array
    return Array.isArray(value) ? value : value ? [value] : [];
  })
  @IsArray()
  @IsEnum(['full-time', 'part-time', 'contract', 'freelance', 'internship'], {
    each: true,
  })
  jobTypes?: string[];

  @IsOptional()
  @Transform(({ value }) => {
    return Array.isArray(value) ? value : value ? [value] : [];
  })
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
  @Transform(({ value }) => {
    return Array.isArray(value) ? value : value ? [value] : [];
  })
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
  @Transform(({ value }) => {
    return Array.isArray(value) ? value : value ? [value] : [];
  })
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
