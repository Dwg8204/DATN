import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CloudinaryMediaService } from '../services/cloudinary-media.service';

@ApiTags('Attempt Media')
@ApiCookieAuth('aptimate_access_token')
@Controller('media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
export class AttemptMediaController {
  constructor(private readonly media: CloudinaryMediaService) {}

  @Post('attempt-audio')
  @Throttle({ default: { limit: 40, ttl: 60 * 60_000 } })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { files: 1, fileSize: 25 * 1024 * 1024 } }))
  uploadAttemptAudio(@UploadedFile() file?: Express.Multer.File) {
    return this.media.uploadAudio(file, 'candidate-recordings');
  }
}
