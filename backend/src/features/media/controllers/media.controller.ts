import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCookieAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CloudinaryMediaService } from '../services/cloudinary-media.service';

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
}
