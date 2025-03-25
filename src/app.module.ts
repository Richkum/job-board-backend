// src/app.module.ts
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common'; // Import MiddlewareConsumer & RequestMethod
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseConfigService } from './config/mongoose.config';
import { MongooseModule } from '@nestjs/mongoose';
import { DeviceMiddleware } from './middleware/device.middleware';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useClass: MongooseConfigService,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply DeviceMiddleware to 'auth/login' POST route
    consumer
      .apply(DeviceMiddleware)
      .forRoutes({ path: 'auth/login', method: RequestMethod.POST });
  }
}
