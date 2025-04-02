// src/auth/dto/register.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9 ]{3,30}$/, {
    message:
      'Username must be 3-30 characters and contain letters, numbers, or spaces.',
  })
  username: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @Length(8, 50)
  password: string;
}
