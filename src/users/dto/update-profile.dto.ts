import { IsString, IsOptional, ValidateNested, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

// Nested DTOs for better structure
class SocialsDto {
  @IsOptional()
  @IsUrl()
  linkedin?: string;

  @IsOptional()
  @IsUrl()
  twitter?: string;

  @IsOptional()
  @IsUrl()
  github?: string;
}

class LocationDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  coordinates?: number[];
}

class CompanyDetailsDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  about?: string;

  @IsOptional()
  @IsUrl()
  companyLogo?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialsDto)
  socials?: SocialsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CompanyDetailsDto)
  companyDetails?: CompanyDetailsDto;

  @IsOptional()
  @IsString({ each: true })
  technologies?: string[];
}
