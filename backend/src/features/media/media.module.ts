import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaController } from './controllers/media.controller';
import { CloudinaryMediaService } from './services/cloudinary-media.service';

@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [CloudinaryMediaService],
  exports: [CloudinaryMediaService],
})
export class MediaModule {}

