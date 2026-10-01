import { ConfigService } from '@nestjs/config';
import { CloudinaryMediaService } from './cloudinary-media.service';

describe('CloudinaryMediaService', () => {
  it('returns a clear error when Cloudinary has not been configured', async () => {
    const config = { get: jest.fn((_key: string, fallback: unknown) => fallback) } as unknown as ConfigService;
    const service = new CloudinaryMediaService(config);
    await expect(service.uploadTestCover()).rejects.toMatchObject({ code: 'CLOUDINARY_NOT_CONFIGURED', statusCode: 503 });
  });
});

