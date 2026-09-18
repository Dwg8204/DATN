import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { ApplicationError } from '../../../common/errors/application.error';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

@Injectable()
export class CloudinaryMediaService {
  private readonly enabled: boolean;
  private readonly folder: string;

  constructor(config: ConfigService) {
    this.enabled = config.get<boolean>('cloudinary.enabled', false);
    this.folder = config.get<string>('cloudinary.folder', 'aptimate/test-covers');
    if (this.enabled) {
      cloudinary.config({
        cloud_name: config.getOrThrow<string>('cloudinary.cloudName'),
        api_key: config.getOrThrow<string>('cloudinary.apiKey'),
        api_secret: config.getOrThrow<string>('cloudinary.apiSecret'),
        secure: true,
      });
    }
  }

  async uploadTestCover(file?: Express.Multer.File) {
    if (!this.enabled) {
      throw new ApplicationError(
        'CLOUDINARY_NOT_CONFIGURED',
        'Image uploads are not configured. Add the Cloudinary settings to the backend environment.',
        503,
      );
    }
    if (!file?.buffer?.length) throw new ApplicationError('IMAGE_REQUIRED', 'Choose an image to upload.', 400);
    if (!ALLOWED_TYPES.has(file.mimetype) || !this.hasValidSignature(file.buffer, file.mimetype)) {
      throw new ApplicationError('INVALID_IMAGE', 'Only valid JPEG, PNG, WebP or GIF images are supported.', 415);
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        folder: this.folder,
        resource_type: 'image',
        unique_filename: true,
        overwrite: false,
        transformation: [{ width: 1600, height: 1200, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }],
      }, (error, response) => error || !response ? reject(error ?? new Error('Cloudinary returned no result.')) : resolve(response));
      stream.end(file.buffer);
    }).catch(() => {
      throw new ApplicationError('IMAGE_UPLOAD_FAILED', 'The image could not be uploaded. Please try again.', 502);
    });

    return {
      url: result.secure_url,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      format: result.format,
    };
  }

  private hasValidSignature(buffer: Buffer, type: string): boolean {
    if (type === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (type === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (type === 'image/gif') return ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'));
    if (type === 'image/webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    return false;
  }
}

