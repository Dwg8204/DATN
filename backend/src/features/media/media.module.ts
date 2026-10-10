import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaController } from './controllers/media.controller';
import { CloudinaryMediaService } from './services/cloudinary-media.service';
import { AttemptMediaController } from './controllers/attempt-media.controller';

@Module({
  imports: [AuthModule],
  controllers: [MediaController, AttemptMediaController],
  providers: [CloudinaryMediaService],
  exports: [CloudinaryMediaService],
})
export class MediaModule {}
