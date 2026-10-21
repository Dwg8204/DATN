import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
export const TOPIC_SKILLS = [
  "GRAMMAR_VOCAB",
  "READING",
  "LISTENING",
  "WRITING",
  "SPEAKING",
];
export class TopicInputDto {
  @Matches(/^[a-z][a-z0-9-]{1,99}$/) code: string;
  @IsString() @Matches(/\S/) @MaxLength(150) name: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsIn(TOPIC_SKILLS) component: string;
  @IsIn(["KNOWLEDGE", "STRATEGY", "CRITERION"]) topicType: string;
  @IsBoolean() isActive: boolean;
}
export class TopicQueryDto {
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
  @IsOptional() @IsIn(TOPIC_SKILLS) component?: string;
  @IsOptional() @IsUUID() testId?: string;
  @IsOptional()
  @IsIn(["SUGGESTED", "APPROVED", "REJECTED", "ALL"])
  status?: string;
  @IsOptional()
  @IsIn(["ALL", "MISSING", "NEEDS_REVIEW", "FAILED"])
  work?: string;
  @IsOptional()
  @IsIn(["ALL", "LOW_CONFIDENCE", "STALE", "HIDDEN_TOPIC"])
  reviewFilter?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
}
export class TopicBulkDto {
  @IsOptional() @IsIn(TOPIC_SKILLS) component?: string;
}
export class TopicApproveTestDto {
  @Matches(/^[a-f0-9]{64}$/) revision: string;
}
export class TopicReviewItemDto {
  @IsUUID() questionId: string;
  @IsUUID() topicId: string;
  @IsOptional() @IsUUID() labelId?: string;
  @Matches(/^[a-f0-9]{32}$/) questionHash: string;
  @IsIn(["APPROVED", "REJECTED"]) status: string;
}
export class TopicReviewDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => TopicReviewItemDto)
  items: TopicReviewItemDto[];
}
