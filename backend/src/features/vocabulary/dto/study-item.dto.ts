import { Type, Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export enum StudyKind { WORD = 'WORD', SENTENCE = 'SENTENCE' }
export class StudyContentDto {
  @IsEnum(StudyKind) kind!: StudyKind;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(255) word!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(5000) meaning!: string;
  @IsOptional() @IsString() @MaxLength(255) pronunciation?: string;
  @IsOptional() @IsString() @MaxLength(50) type?: string;
  @IsOptional() @IsString() @MaxLength(5000) example?: string;
  @IsOptional() @IsEnum({ GB: 'en-GB', US: 'en-US' }) accent?: string;
}
export class StudyItemDto extends StudyContentDto {
  @IsUUID() folderId!: string;
  @IsOptional() @IsUUID() clientRequestId?: string;
}
export class LegacyProgressDto {
  @IsInt() @Min(0) @Max(100000) attempts!: number;
  @IsNumber() @Min(0) @Max(100) lastAccuracy!: number;
  @IsNumber() @Min(0) @Max(100) bestAccuracy!: number;
  @IsOptional() @IsISO8601() updatedAt?: string;
}
export class ImportStudyItemDto extends StudyContentDto {
  @IsString() @IsNotEmpty() @MaxLength(100) legacyId!: string;
  @IsString() @IsNotEmpty() @MaxLength(40) topic!: string;
  @IsOptional() @IsBoolean() hidden?: boolean;
  @IsOptional() @IsEnum({ KNOWN: 'KNOWN', LEARNING: 'LEARNING' }) rating?: 'KNOWN' | 'LEARNING';
  @IsOptional() @ValidateNested() @Type(() => LegacyProgressDto) progress?: LegacyProgressDto;
}
export class ImportStudyDto {
  @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => ImportStudyItemDto)
  items!: ImportStudyItemDto[];
  @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) @MaxLength(40, { each: true }) topics!: string[];
}
