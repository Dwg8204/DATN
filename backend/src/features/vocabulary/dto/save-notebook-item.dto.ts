import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum NotebookItemType {
  WORD = 'WORD',
  PHRASE = 'PHRASE',
  SENTENCE = 'SENTENCE',
}

export class SaveNotebookItemDto {
  @IsUUID()
  @IsNotEmpty()
  folderId!: string;

  @IsEnum(NotebookItemType)
  itemType!: NotebookItemType;

  @IsUUID()
  @IsOptional()
  vocabularyEntryId?: string;

  @IsString()
  @IsOptional()
  userExample?: string;

  @IsString()
  @IsOptional()
  userNotes?: string;
}
