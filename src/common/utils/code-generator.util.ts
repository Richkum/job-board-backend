import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CodeGenerator {
  generateSixDigitCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  getCodeExpiration(minutes = 25): Date {
    const date = new Date();
    date.setMinutes(date.getMinutes() + minutes);
    return date;
  }
}
