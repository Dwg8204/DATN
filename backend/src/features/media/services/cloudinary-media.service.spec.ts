import { ConfigService } from '@nestjs/config';
import { CloudinaryMediaService } from './cloudinary-media.service';
import { v2 as cloudinary, UploadApiResponse, UploadResponseCallback } from 'cloudinary';

jest.mock('cloudinary', () => ({ v2: { config: jest.fn(), uploader: { upload_stream: jest.fn() } } }));

describe('CloudinaryMediaService', () => {
  it('returns a clear error when Cloudinary has not been configured', async () => {
    const config = { get: jest.fn((_key: string, fallback: unknown) => fallback) } as unknown as ConfigService;
    const service = new CloudinaryMediaService(config);
    await expect(service.uploadTestCover()).rejects.toMatchObject({ code: 'CLOUDINARY_NOT_CONFIGURED', statusCode: 503 });
  });

  it('retains a Vietnamese attachment name when Cloudinary storage is enabled', async () => {
    const fileBytes = Buffer.from('Test attachment');
    const end = jest.fn();
    jest.mocked(cloudinary.uploader.upload_stream).mockImplementation((...args: unknown[]) => {
      const callback = args[1] as UploadResponseCallback | undefined;
      end.mockImplementation((buffer: Buffer) => {
        expect(buffer).toEqual(fileBytes);
        callback?.(undefined, {
          secure_url: 'https://files.example.com/test.pdf', bytes: fileBytes.length,
          public_id: 'aptimate/notification-attachments/test', resource_type: 'raw',
        } as UploadApiResponse);
      });
      return { end } as unknown as ReturnType<typeof cloudinary.uploader.upload_stream>;
    });
    const service = new CloudinaryMediaService(new ConfigService({ cloudinary: {
      enabled: true, cloudName: 'test', apiKey: 'test', apiSecret: 'test',
    } }));
    const result = await service.uploadNotificationAttachment({
      originalname: 'Báo cáo tổng hợp tiếng Việt.pdf', mimetype: 'application/pdf',
      buffer: fileBytes, size: fileBytes.length,
    } as Express.Multer.File);
    expect(result).toMatchObject({ name: 'Báo cáo tổng hợp tiếng Việt.pdf', resourceType: 'raw' });
    expect(end).toHaveBeenCalledTimes(1);
  });
});

