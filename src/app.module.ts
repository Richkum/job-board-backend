// import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
// import { AppController } from './app.controller';
// import { AppService } from './app.service';
// import { MongooseConfigService } from './config/mongoose.config';
// import { MongooseModule } from '@nestjs/mongoose';
// import { DeviceMiddleware } from './middleware/device.middleware';

// @Module({
//   imports: [
//     MongooseModule.forRootAsync({
//       useClass: MongooseConfigService,
//     }),
//   ],
//   controllers: [AppController],
//   providers: [AppService],
// })
// export class AppModule {
//   configure(consumer: MiddlewareConsumer) {
//     consumer
//       .apply(DeviceMiddleware)
//       .forRoutes({ path: 'auth/login', method: RequestMethod.POST });
//   }
// }

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MongooseConfigService } from './config/mongoose.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // MongoDB configuration (keeping your existing setup)
    MongooseModule.forRootAsync({
      useClass: MongooseConfigService,
    }),
    // Add both modules
    AuthModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
