import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';

config();

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.use(bodyParser.json()); // For JSON payloads
  app.use(bodyParser.urlencoded({ extended: true })); // For form data

  // Enhanced request logging middleware
  app.use((req, res, next) => {
    logger.log(`Incoming Request: ${req.method} ${req.url}`);
    if (req.method !== 'GET') {
      logger.debug(`Request Body: ${JSON.stringify(req.body)}`);
    }

    // Track response time
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.log(`Response: ${res.statusCode} - ${duration}ms`);
    });

    next();
  });

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Add validation pipe globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        logger.error(`Validation errors: ${JSON.stringify(errors)}`);
        const messages = errors.map((error) => {
          const constraints = error.constraints
            ? Object.values(error.constraints).join(', ')
            : 'invalid';
          return `${error.property} ${constraints}`;
        });
        return new Error(`Validation failed: ${messages.join('; ')}`);
      },
    }),
  );

  // Add exception filter for validation errors
  app.useGlobalFilters(new ValidationExceptionFilter());

  // Add API prefix (optional, but recommended)
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 5000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);

  // Graceful shutdown on Ctrl+C
  process.on('SIGINT', async () => {
    logger.log('Gracefully shutting down...');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
