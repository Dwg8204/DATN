import { Controller, Get, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCookieAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CloudinaryMediaService } from '../services/cloudinary-media.service';
import { Request, Response } from 'express';
import { join } from 'node:path';

@ApiTags('Media')
@ApiCookieAuth('aptimate_access_token')
@Controller('admin/media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEACHER')
export class MediaController {
  constructor(private readonly media: CloudinaryMediaService) {}

  @Post('test-covers')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { files: 1, fileSize: 10 * 1024 * 1024 } }))
  uploadTestCover(@UploadedFile() file?: Express.Multer.File) {
    return this.media.uploadTestCover(file);
  }

  @Post('audio')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { files: 1, fileSize: 20 * 1024 * 1024 } }))
  uploadAudio(@UploadedFile() file?: Express.Multer.File) {
    return this.media.uploadAudio(file);
  }

  @Post('notification-attachments')
  @Roles('ADMIN')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  // Browser multipart filenames are UTF-8; Multer's Latin-1 default corrupts Vietnamese accents.
  @UseInterceptors(FileInterceptor('file', { defParamCharset: 'utf8', limits: { files: 1, fileSize: 2 * 1024 * 1024 } }))
  async uploadNotificationAttachment(@UploadedFile() file: Express.Multer.File | undefined, @Req() request: Request) {
    const uploaded = await this.media.uploadNotificationAttachment(file);
    if (uploaded.url.startsWith('/')) {
      const forwardedProtocol = request.header('x-forwarded-proto')?.split(',')[0]?.trim();
      uploaded.url = `${forwardedProtocol || request.protocol}://${request.get('host')}${uploaded.url}`;
    }
    return uploaded;
  }

  @Get('notification-attachments/files/:fileName')
  @Roles('ADMIN', 'TEACHER', 'STUDENT')
  downloadNotificationAttachment(@Param('fileName') fileName: string, @Res() response: Response) {
    if (!/^[0-9a-f-]{36}(?:\.[a-z0-9]{1,9})?$/.test(fileName)) return response.sendStatus(404);
    response.removeHeader('X-Frame-Options');
    response.removeHeader('Content-Security-Policy');
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    return response.sendFile(fileName, { root: join(process.cwd(), 'uploads', 'notification-attachments') });
  }
}
