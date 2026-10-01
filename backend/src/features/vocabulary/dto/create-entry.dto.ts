import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum VocabularyItemType {
  WORD = 'WORD',
  PHRASE = 'PHRASE',
}

export enum VocabularySourceType {
  SYSTEM = 'SYSTEM',
  DICTIONARY = 'DICTIONARY',
  AI = 'AI',
  TEACHER = 'TEACHER',
}

export class CreateEntryDto {
  @IsUUID()
  @IsOptional()
  defaultFolderId?: string;

  @IsEnum(VocabularyItemType)
  itemType!: VocabularyItemType;

  @IsString()
  @IsNotEmpty()
  term!: string;

  @IsString()
  @IsOptional()
  languageCode?: string = 'en';

  @IsString()
  @IsOptional()
  meaningLanguage?: string = 'vi';

  @IsString()
  @IsNotEmpty()
  meaning!: string;

  @IsString()
  @IsOptional()
  phonetic?: string;

  @IsString()
  @IsOptional()
  partOfSpeech?: string;

  @IsString()
  @IsOptional()
  contextSentence?: string;

  @IsEnum(VocabularySourceType)
  @IsOptional()
  sourceType?: VocabularySourceType = VocabularySourceType.SYSTEM;
}
