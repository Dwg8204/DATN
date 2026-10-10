import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { StorageService } from '../../../common/storage/storage.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ProfileRepository } from '../repositories/profile.repository';
import { UserProfile, AvatarMeta } from '../types/profile.type';

@Injectable()
export class ProfileService {
  constructor(
    private readonly repository: ProfileRepository,
    private readonly storage: StorageService,
  ) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      throw new ApplicationError('USER_NOT_FOUND', 'User profile not found', 404);
    }
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    if (Object.keys(dto).length === 0) {
      throw new ApplicationError('EMPTY_UPDATE', 'No fields provided for update', 400);
    }

    const updated = await this.repository.updateProfile(userId, {
      firstName: dto.firstName?.trim(),
      lastName: dto.lastName?.trim(),
      phone: dto.phone?.trim(),
      bio: dto.bio?.trim(),
      timezone: dto.timezone?.trim(),
    });

    if (!updated) {
      throw new ApplicationError('USER_NOT_FOUND', 'User profile not found', 404);
    }
    return updated;
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<AvatarMeta> {
    if (!file) {
      throw new ApplicationError('FILE_MISSING', 'No file provided', 400);
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new ApplicationError('INVALID_FILE_TYPE', 'Only JPEG, PNG and WebP images are allowed', 400);
    }

    const currentProfile = await this.getProfile(userId);
    const previousPublicId = currentProfile.avatar?.publicId;

    const uploadResult = await this.storage.uploadImage(file.buffer, {
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' }
      ]
    });

    const newAvatar: AvatarMeta = {
      publicId: uploadResult.public_id,
      url: uploadResult.secure_url,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
    };

    await this.repository.updateAvatar(userId, newAvatar);

    if (previousPublicId) {
      await this.storage.deleteFile(previousPublicId);
    }

    return newAvatar;
  }

}
