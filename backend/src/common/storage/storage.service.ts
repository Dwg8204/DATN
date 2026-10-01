import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';
import { ApplicationError } from '../errors/application.error';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly config: ConfigService) {
    if (this.config.get<boolean>('cloudinary.enabled')) {
      const cloudName = this.config.getOrThrow<string>('cloudinary.cloudName');
      this.logger.log(`Initializing Cloudinary with cloud_name: ${cloudName}`);
      cloudinary.config({
        cloud_name: cloudName,
        api_key: this.config.getOrThrow<string>('cloudinary.apiKey'),
        api_secret: this.config.getOrThrow<string>('cloudinary.apiSecret'),
      });
    }
  }

  async uploadImage(buffer: Buffer, options?: UploadApiOptions): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: this.config.get<string>('cloudinary.avatarFolder', 'aptimate/avatars'),
          ...options,
        },
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary upload error: ${error.message}`, error);
            return reject(new ApplicationError('UPLOAD_FAILED', 'Failed to upload image to cloud storage', 500));
          }
          if (!result) {
            return reject(new ApplicationError('UPLOAD_FAILED', 'No result from cloud storage', 500));
          }
          resolve(result);
        }
      );

      const readableStream = new Readable({
        read() {
          this.push(buffer);
          this.push(null);
        }
      });

      readableStream.pipe(uploadStream);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      if (result.result !== 'ok' && result.result !== 'not found') {
        this.logger.warn(`Cloudinary destroy returned non-ok result for ${publicId}: ${result.result}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file ${publicId} from Cloudinary`, error instanceof Error ? error.stack : undefined);
    }
  }
}
