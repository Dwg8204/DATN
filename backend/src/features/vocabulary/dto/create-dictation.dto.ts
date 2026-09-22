import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum DictationAudioSource {
  UPLOADED = 'UPLOADED',
  TTS = 'TTS',
}

export class CreateDictationExerciseDto {
  @IsUUID()
  @IsNotEmpty()
  folderId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  transcript!: string;

  @IsEnum(DictationAudioSource)
  audioSource!: DictationAudioSource;

  @IsString()
  @IsOptional()
  locale?: string = 'en-US';

  @IsString()
  @IsOptional()
  practiceLevel?: string = 'INTERMEDIATE';
}
