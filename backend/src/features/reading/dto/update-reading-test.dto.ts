import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateReadingTestDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsInt()
  @Min(1)
  @Max(4)
  @IsOptional()
  partNumber?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationMinutes?: number;
}
