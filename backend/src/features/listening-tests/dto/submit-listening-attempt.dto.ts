import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitListeningAttemptDto {
  @ApiProperty({ description: 'ID của phiên làm bài (do API startAttempt trả về)' })
  @IsString()
  attemptId!: string;

  @ApiPropertyOptional({ 
    description: 'Các câu trả lời của người dùng chia theo từng phần',
    example: {
      part1: { "1": 0, "2": 2 },
      part2: { "0": "He wants to work in medicine.", "1": "She will study biology." },
      part3: { "15a": "Man", "15b": "Woman" },
      part4: { "16": 1, "17": 0 }
    }
  })
  @IsObject()
  @IsOptional()
  answers?: {
    part1?: Record<string, number>;
    part2?: Record<string, string>;
    part3?: Record<string, string>;
    part4?: Record<string, number>;
  };

  @ApiProperty({ description: 'Tổng thời gian làm bài tính bằng mili giây', example: 120500 })
  @IsNumber()
  timeSpentMs!: number;
}
