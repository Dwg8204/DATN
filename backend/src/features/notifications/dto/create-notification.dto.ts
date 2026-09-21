import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

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

  @IsString()
  @IsOptional()
  actionPath?: string;
}
