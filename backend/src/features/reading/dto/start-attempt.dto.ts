import { IsNotEmpty, IsUUID } from 'class-validator';

export class StartAttemptDto {
  @IsUUID()
  @IsNotEmpty()
  testId!: string;
}
