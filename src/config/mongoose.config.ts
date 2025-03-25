import {
  MongooseModuleOptions,
  MongooseOptionsFactory,
} from '@nestjs/mongoose';
import { Injectable, Logger } from '@nestjs/common';
import { Connection } from 'mongoose';

@Injectable()
export class MongooseConfigService implements MongooseOptionsFactory {
  private readonly logger = new Logger(MongooseConfigService.name);

  createMongooseOptions(): MongooseModuleOptions {
    if (!process.env.MONGO_URL) {
      throw new Error('MONGO_URL environment variable is not set');
    }

    // Log the connection URL (mask password for security)
    const maskedUrl = this.maskMongoUrl(process.env.MONGO_URL);
    console.log(`Connecting to MongoDB: ${maskedUrl}`);

    return {
      uri: process.env.MONGO_URL,
      connectionFactory: (connection: Connection) => {
        connection.on('connected', () => {
          console.log('✅ MongoDB successfully connected!');
          this.logDatabaseStats(connection);
        });
        connection.on('error', (err) => {
          console.error('❌ MongoDB connection error:', err.message);
        });
        connection.on('disconnected', () => {
          console.warn('⚠️ MongoDB disconnected!');
        });
        return connection;
      },
      retryAttempts: 5,
      retryDelay: 3000,
    };
  }

  private maskMongoUrl(url: string): string {
    return url.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@');
  }

  private async logDatabaseStats(connection: Connection) {
    try {
      // Wait for connection to be fully established
      await new Promise((resolve) => connection.once('open', resolve));

      // Now we can safely access connection.db
      if (connection.db) {
        const adminDb = connection.db.admin();
        const serverStatus = await adminDb.serverStatus();
        const dbInfo = await connection.db.stats();

        this.logger.debug(`MongoDB server version: ${serverStatus.version}`);
        this.logger.debug(`Database name: ${dbInfo.db}`);
        this.logger.debug(`Collections count: ${dbInfo.collections}`);
      } else {
        this.logger.warn('Connection DB instance not available');
      }
    } catch (err) {
      this.logger.warn('Could not fetch database stats:', err.message);
    }
  }
}
