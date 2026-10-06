import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  IsInt,
  IsISO8601,
  Min,
  Max,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum NotificationType {
  SYSTEM = 'SYSTEM',
  TEST_RESULT = 'TEST_RESULT',
  LEARNING_REMINDER = 'LEARNING_REMINDER',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  BANNER = 'BANNER',
}

export enum NotificationAudienceType {
  ALL = 'ALL',
  ROLE = 'ROLE',
  SELECTED_USERS = 'SELECTED_USERS',
}

export class NotificationAttachmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(2 * 1024 * 1024)
  size!: number;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  url!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  publicId!: string;
}

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsEnum(NotificationAudienceType)
  audienceType!: NotificationAudienceType;

  @IsUUID()
  @IsOptional()
  audienceRoleId?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  targetUserIds?: string[];

  @ValidateNested()
  @Type(() => NotificationAttachmentDto)
  @IsOptional()
  attachment?: NotificationAttachmentDto;

  @IsString()
  @IsOptional()
  actionPath?: string;

  @IsISO8601({ strict: true })
  @IsOptional()
  scheduledAt?: string;
}
