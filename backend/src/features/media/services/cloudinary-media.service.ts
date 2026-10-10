import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { ApplicationError } from '../../../common/errors/application.error';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const NOTIFICATION_ATTACHMENT_TYPES = new Set([
  'application/pdf', 'text/plain', 'text/csv',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/aac',
  'video/mp4', 'video/webm',
]);

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

  async uploadAudio(file?: Express.Multer.File, subfolder?: string) {
    if (!this.enabled) {
      throw new ApplicationError(
        'CLOUDINARY_NOT_CONFIGURED',
        'Audio uploads are not configured. Add the Cloudinary settings to the backend environment.',
        503,
      );
    }
    if (!file?.buffer?.length) throw new ApplicationError('AUDIO_REQUIRED', 'Choose an audio file to upload.', 400);
    if (!['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/aac'].includes(file.mimetype)) {
      throw new ApplicationError('INVALID_AUDIO', 'Only valid MP3, WAV, OGG, WEBM or AAC audio files are supported.', 415);
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        folder: subfolder ? `${this.folder}/${subfolder}` : this.folder,
        resource_type: 'auto',
        unique_filename: true,
        overwrite: false,
      }, (error, response) => error || !response ? reject(error ?? new Error('Cloudinary returned no result.')) : resolve(response));
      stream.end(file.buffer);
    }).catch(() => {
      throw new ApplicationError('AUDIO_UPLOAD_FAILED', 'The audio could not be uploaded. Please try again.', 502);
    });

    return {
      url: result.secure_url,
      bytes: result.bytes,
      format: result.format,
      duration: result.duration,
    };
  }

  async uploadNotificationAttachment(file?: Express.Multer.File) {
    if (!file?.buffer?.length) throw new ApplicationError('ATTACHMENT_REQUIRED', 'Choose a file to upload.', 400);
    if (file.size > 2 * 1024 * 1024) throw new ApplicationError('ATTACHMENT_TOO_LARGE', 'Attachment must be 2 MB or smaller.', 413);
    if (!NOTIFICATION_ATTACHMENT_TYPES.has(file.mimetype)) {
      throw new ApplicationError('INVALID_ATTACHMENT', 'This attachment type is not supported.', 415);
    }

    const safeName = file.originalname.normalize('NFC').replace(/[\\/]/g, '_').slice(0, 255);
    if (!this.enabled) {
      const extension = extname(safeName).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
      const storedName = `${randomUUID()}${extension}`;
      const directory = join(process.cwd(), 'uploads', 'notification-attachments');
      try {
        await mkdir(directory, { recursive: true });
        await writeFile(join(directory, storedName), file.buffer, { flag: 'wx' });
      } catch {
        throw new ApplicationError('ATTACHMENT_UPLOAD_FAILED', 'The attachment could not be stored. Please try again.', 500);
      }
      return {
        name: safeName,
        mimeType: file.mimetype,
        size: file.size,
        url: `/api/v1/admin/media/notification-attachments/files/${storedName}`,
        publicId: `local:notification-attachments/${storedName}`,
        resourceType: 'local',
      };
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        folder: `${this.folder}/notification-attachments`,
        resource_type: 'auto',
        unique_filename: true,
        overwrite: false,
      }, (error, response) => error || !response ? reject(error ?? new Error('Cloudinary returned no result.')) : resolve(response));
      stream.end(file.buffer);
    }).catch(() => {
      throw new ApplicationError('ATTACHMENT_UPLOAD_FAILED', 'The attachment could not be uploaded. Please try again.', 502);
    });

    return {
      name: safeName,
      mimeType: file.mimetype,
      size: result.bytes,
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
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

