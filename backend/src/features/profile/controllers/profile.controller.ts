import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCookieAuth, ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthUser } from '../../auth/types/auth-user.type';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ProfileService } from '../services/profile.service';

const ACCESS_COOKIE = 'aptimate_access_token';

@ApiTags('Profile')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin hồ sơ của người dùng hiện tại' })
  @ApiResponse({ status: 200, description: 'Trả về toàn bộ thông tin profile của user' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  getProfile(@CurrentUser() user: AuthUser) {
    return this.profileService.getProfile(user.id);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật thông tin cơ bản của hồ sơ' })
  @ApiResponse({ status: 200, description: 'Thông tin được cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar', {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit at Multer level as well
    }
  }))
  @ApiOperation({ summary: 'Tải lên avatar mới (tối đa 5MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Avatar được tải lên thành công' })
  @ApiResponse({ status: 400, description: 'File không hợp lệ hoặc quá lớn' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  uploadAvatar(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    return this.profileService.uploadAvatar(user.id, file);
  }

}
