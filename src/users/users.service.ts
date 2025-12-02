// src/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDocument } from './schema/user.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('User') private userModel: Model<UserDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async findById(id: string): Promise<UserDocument> {
    console.log(`Attempting to find user with ID: ${id}`);
    const user = await this.userModel.findById(id).exec();
    console.log(`User found: ${user}`);
    if (!user) {
      console.log(`User with ID ${id} not found`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async updateProfile(
    userId: string,
    requestUserId: string,
    updateProfileDto: UpdateProfileDto,
    profilePicture?: Express.Multer.File,
  ): Promise<UserDocument> {
    // Verify the user is updating their own profile
    if (userId !== requestUserId) {
      throw new UnauthorizedException('You can only update your own profile');
    }

    const user = await this.findById(userId);

    // Create the update object starting with empty profile changes
    const updateData: any = {};

    console.log('updateProfileDto:', updateProfileDto);

    // Populate the update fields based on the DTO
    if (updateProfileDto) {
      if (updateProfileDto.bio !== undefined)
        updateData['profile.bio'] = updateProfileDto.bio;
      if (updateProfileDto.technologies !== undefined)
        updateData['profile.technologies'] = updateProfileDto.technologies;

      // Handle nested objects
      if (updateProfileDto.socials) {
        if (updateProfileDto.socials.linkedin !== undefined)
          updateData['profile.socials.linkedin'] =
            updateProfileDto.socials.linkedin;
        if (updateProfileDto.socials.twitter !== undefined)
          updateData['profile.socials.twitter'] =
            updateProfileDto.socials.twitter;
        if (updateProfileDto.socials.github !== undefined)
          updateData['profile.socials.github'] =
            updateProfileDto.socials.github;
      }

      if (updateProfileDto.location) {
        if (updateProfileDto.location.country !== undefined)
          updateData['profile.location.country'] =
            updateProfileDto.location.country;
        if (updateProfileDto.location.city !== undefined)
          updateData['profile.location.city'] = updateProfileDto.location.city;
        if (updateProfileDto.location.coordinates !== undefined)
          updateData['profile.location.coordinates'] =
            updateProfileDto.location.coordinates;
      }

      if (updateProfileDto.companyDetails) {
        if (updateProfileDto.companyDetails.companyName !== undefined)
          updateData['profile.companyDetails.companyName'] =
            updateProfileDto.companyDetails.companyName;
        if (updateProfileDto.companyDetails.website !== undefined)
          updateData['profile.companyDetails.website'] =
            updateProfileDto.companyDetails.website;
        if (updateProfileDto.companyDetails.about !== undefined)
          updateData['profile.companyDetails.about'] =
            updateProfileDto.companyDetails.about;
        if (updateProfileDto.companyDetails.companyLogo !== undefined)
          updateData['profile.companyDetails.companyLogo'] =
            updateProfileDto.companyDetails.companyLogo;
      }
    }

    // Handle profile picture upload if provided
    if (profilePicture) {
      console.log('profilePicture:', profilePicture);

      // If there's an existing profile picture, delete it first
      if (user.profilePicture) {
        console.log('Deleting profile picture:', user.profilePicture);
        await this.cloudinaryService.deleteImage(user.profilePicture);
      }

      // Upload the new profile picture
      const profilePictureUrl =
        await this.cloudinaryService.uploadImage(profilePicture);
      updateData.profilePicture = profilePictureUrl;
    }

    console.log('updateData:', updateData);

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      console.log('No changes, returning original user');
      return user; // Return the original user if no updates
    }

    // Update the user with all the changes
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    console.log('Updated user:', updatedUser);

    return updatedUser;
  }

  async getUserProfile(userId: string): Promise<UserDocument> {
    return this.findById(userId);
  }
}
