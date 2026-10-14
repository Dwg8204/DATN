import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export const COMMENT_SKILLS = ['grammar-vocab', 'writing', 'reading', 'listening', 'speaking'] as const;

export class CommentScopeDto {
  @IsIn(COMMENT_SKILLS)
  skill!: string;
}

export class ListCommentsDto extends CommentScopeDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000)
  page = 1;
}

export class CreateCommentDto extends CommentScopeDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(2000)
  content!: string;

  // The comment being answered, which may itself be a reply.
  @IsOptional() @IsUUID()
  replyToId?: string;
}
