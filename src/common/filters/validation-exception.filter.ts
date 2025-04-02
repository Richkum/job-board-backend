// src/common/filters/validation-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    this.logger.error(`Validation error: ${JSON.stringify(exceptionResponse)}`);

    // Format validation errors into a more readable structure
    let validationErrors = {};

    if (Array.isArray(exceptionResponse.message)) {
      exceptionResponse.message.forEach((error: string) => {
        const parts = error.split(' ');
        if (parts.length > 1) {
          const field = parts[0];
          const constraint = parts.slice(1).join(' ');

          if (!validationErrors[field]) {
            validationErrors[field] = [];
          }

          validationErrors[field].push(constraint);
        }
      });
    } else if (typeof exceptionResponse.message === 'string') {
      validationErrors['general'] = [exceptionResponse.message];
    }

    response.status(status).json({
      success: false,
      message: Array.isArray(exceptionResponse.message)
        ? exceptionResponse.message.join('; ')
        : exceptionResponse.message || 'Validation failed',
      errors: validationErrors,
    });
  }
}
