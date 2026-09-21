import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum TestScope {
  FULL_SKILL = 'FULL_SKILL',
  PART = 'PART',
}

export class CreateReadingTestDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(TestScope)
  scope!: TestScope;

  @IsInt()
  @Min(1)
  @Max(4)
  @IsOptional()
  partNumber?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationMinutes?: number = 35;
}
