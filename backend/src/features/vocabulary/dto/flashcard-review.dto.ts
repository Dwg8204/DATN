import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';

export enum VocabularyRating {
  LEARNING = 'LEARNING',
  KNOWN = 'KNOWN',
}

export class FlashcardReviewDto {
  @IsUUID()
  @IsNotEmpty()
  notebookItemId!: string;

  @IsUUID()
  @IsNotEmpty()
  clientEventId!: string;

  @IsEnum(VocabularyRating)
  rating!: VocabularyRating;

  @IsInt()
  @Min(0)
  @IsOptional()
  durationMs?: number;
}
