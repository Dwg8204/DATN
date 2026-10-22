import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, Min } from 'class-validator';

export class ChatPageDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
}
export class CreateChatDto {
  @IsUUID() id: string;
  @IsOptional() @IsUUID() attemptId?: string;
  @IsOptional() @IsUUID() insightId?: string;
  @IsOptional() @Matches(/^p[1-4]:[qs]\d{1,3}$/) questionKey?: string;
}
export class RenameChatDto {
  @IsString() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @Length(1,200) title: string;
}
export class SendChatDto {
  @IsUUID() clientMessageId: string;
  @IsString() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @Length(1,4000) content: string;
}
export class FeedbackDto {
  @IsIn([-1,0,1]) feedback: number;
}
