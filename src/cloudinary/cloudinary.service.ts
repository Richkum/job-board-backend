import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'user_profiles',
  ): Promise<string> {
    try {
      // Convert the buffer to base64 string
      const base64String = Buffer.from(file.buffer).toString('base64');
      const dataURI = `data:${file.mimetype};base64,${base64String}`;

      // Upload to cloudinary
      const result = await cloudinary.uploader.upload(dataURI, {
        folder,
        resource_type: 'auto',
      });

      // Return the secure URL
      return result.secure_url;
    } catch (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  async deleteImage(publicUrl: string): Promise<boolean> {
    try {
      // Extract public ID from the URL
      const publicId = this.extractPublicIdFromUrl(publicUrl);

      if (!publicId) {
        return false;
      }

      // Delete the image
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Failed to delete image:', error);
      return false;
    }
  }

  private extractPublicIdFromUrl(url: string): string | null {
    try {
      // Expected format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{public_id}.{extension}
      const regex = /\/v\d+\/(.+)\.\w+$/;
      const match = url.match(regex);

      if (match && match[1]) {
        return match[1];
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}
