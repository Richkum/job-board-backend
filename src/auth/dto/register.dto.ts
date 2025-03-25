// src/auth/dto/register.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  readonly username: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  readonly email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/, {
    message:
      'Password must contain at least one letter, one number, and one special character',
  })
  readonly password: string;
}
