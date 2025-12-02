// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from './schema/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from 'src/auth/auth.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

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
