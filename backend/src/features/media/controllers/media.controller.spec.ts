import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { mkdir, writeFile } from 'node:fs/promises';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CloudinaryMediaService } from '../services/cloudinary-media.service';
import { MediaController } from './media.controller';
import { HttpExceptionFilter } from '../../../common/filters/http-exception.filter';

jest.mock('node:fs/promises', () => ({ mkdir: jest.fn(), writeFile: jest.fn() }));

describe('Notification attachment filename encoding (multipart)', () => {
  let app: INestApplication;
  const fileBytes = Buffer.from('Attachment content remains unchanged', 'utf8');

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [CloudinaryMediaService, {
        provide: ConfigService,
        useValue: { get: (_key: string, fallback: unknown) => fallback },
      }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['Báo cáo tổng hợp tiếng Việt.pdf', 'application/pdf'],
    ['Nguyễn Thảo Như Quỳnh.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['Bảng điểm học viên.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['Bài thuyết trình.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    ['Ảnh lớp học.png', 'image/png'],
    ['Café résumé.pdf', 'application/pdf'],
    ['report_2026.pdf', 'application/pdf'],
    ['Ba\u0301o ca\u0301o tie\u0302\u0301ng Vie\u0323\u0302t.pdf', 'application/pdf'],
  ])('preserves the UTF-8 filename %s in the upload response', async (filename, contentType) => {
    const response = await request(app.getHttpServer())
      .post('/admin/media/notification-attachments')
      .attach('file', fileBytes, { filename, contentType })
      .expect(201);

    expect(response.body).toMatchObject({
      name: filename.normalize('NFC'), mimeType: contentType,
      size: fileBytes.length, resourceType: 'local',
    });
    expect(response.body.url).toMatch(/^http:\/\/.*\/api\/v1\/admin\/media\/notification-attachments\/files\/[0-9a-f-]{36}\.[a-z0-9]+$/);
    expect(mkdir).toHaveBeenCalledTimes(1);
    expect(writeFile).toHaveBeenCalledWith(expect.any(String), fileBytes, { flag: 'wx' });
  });

  it('still rejects unsupported files', async () => {
    await request(app.getHttpServer())
      .post('/admin/media/notification-attachments')
      .attach('file', fileBytes, { filename: 'Tệp thực thi.exe', contentType: 'application/octet-stream' })
      .expect(415);
    expect(writeFile).not.toHaveBeenCalled();
  });
});
