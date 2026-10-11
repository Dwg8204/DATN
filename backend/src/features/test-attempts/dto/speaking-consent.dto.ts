import { Equals, IsBoolean, IsIn } from 'class-validator';

export class SpeakingConsentDto {
  @IsBoolean() @Equals(true) confirmedAdult!: boolean;
  @IsBoolean() @Equals(true) accepted!: boolean;
  @IsIn(['speaking-ai-v1', 'speaking-ai-free-v2']) policyVersion!: string;
}
