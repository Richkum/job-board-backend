import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsNumber,
  IsDate,
  IsBoolean,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Min,
  ValidateNested,
  ArrayNotEmpty,
  ArrayMinSize,
  ValidateIf,
} from 'class-validator';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Job title must be at least 3 characters long' })
  @MaxLength(100, { message: 'Job title cannot exceed 100 characters' })
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200, { message: 'Subtitle cannot exceed 200 characters' })
  subtitle: string;

  @IsString()
  @IsEnum(['full-time', 'part-time', 'contract', 'freelance', 'internship'], {
    message: 'Invalid job type selected',
  })
  jobType: string;

  @IsString()
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
    {
      message: 'Invalid category selected',
    },
  )
  category: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'At least one requirement is needed' })
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
          ? parsed.filter((item) => item.trim().length > 0)
          : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(value)
      ? value.filter((item) => item.trim().length > 0)
      : [];
  })
  requirements: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
          ? parsed.filter((item) => item.trim().length > 0)
          : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(value)
      ? value.filter((item) => item.trim().length > 0)
      : [];
  })
  technicalRequirements?: string[];

  @IsString()
  @IsNotEmpty()
  @MinLength(50, { message: 'Description must be at least 50 characters long' })
  description: string;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'Salary cannot be negative' })
  @Transform(({ value }) => (value ? Number(value) : undefined))
  salaryMin?: number;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'Salary cannot be negative' })
  @ValidateIf((o) => o.salaryMin !== undefined)
  @Transform(({ value, obj }) => {
    const num = Number(value);
    if (isNaN(num)) return undefined;
    if (obj.salaryMin !== undefined && num < obj.salaryMin) {
      throw new Error('Maximum salary must be greater than minimum salary');
    }
    return num;
  })
  salaryMax?: number;

  @IsString()
  @IsOptional()
  @IsEnum(['USD', 'EUR', 'GBP', 'FCFA'], {
    message: 'Invalid currency selected',
  })
  salaryCurrency?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['hourly', 'monthly', 'yearly'], {
    message: 'Invalid salary period selected',
  })
  salaryPeriod?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return value;
  })
  salaryNegotiable?: boolean;

  @IsString()
  @IsEnum(['remote', 'on-site', 'hybrid'], {
    message: 'Invalid location type selected',
  })
  locationType: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => ['on-site', 'hybrid'].includes(o.locationType))
  locationCountry?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => ['on-site', 'hybrid'].includes(o.locationType))
  locationCity?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => ['on-site', 'hybrid'].includes(o.locationType))
  locationAddress?: string;

  @IsDate()
  @Type(() => Date)
  @Transform(({ value }) => {
    const date = new Date(value);
    if (date <= new Date()) {
      throw new Error('Application deadline must be in the future');
    }
    return date;
  })
  applicationDeadline: Date;

  @IsString()
  @IsEnum(['entry', 'junior', 'mid', 'senior', 'lead', 'any'], {
    message: 'Invalid experience level selected',
  })
  experienceLevel: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
          ? parsed.filter((item) => item.trim().length > 0)
          : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(value)
      ? value.filter((item) => item.trim().length > 0)
      : [];
  })
  benefits?: string[];
}
