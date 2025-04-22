// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from '../users/schema/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { AuthModule } from 'src/auth/auth.module';

/**
 * UsersModule
 *
 * This module contains the user schema, service, and controller
 */
@Module({
  imports: [
    /**
     * AuthModule is imported to allow use of the JWT authentication
     * strategy for the users controller
     */
    AuthModule,
    /**
     * MongooseModule is imported to access the User schema
     */
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    /**
     * CloudinaryModule is imported to allow use of the cloudinary service
     * for image uploads
     */
    CloudinaryModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
