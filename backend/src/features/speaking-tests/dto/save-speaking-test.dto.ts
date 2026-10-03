import { IsIn, IsInt, IsObject, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { TestPurpose } from '../../../common/tests/test-purpose';
import { SpeakingTestAggregate, SpeakingTestMode } from '../types/speaking-test.type';

export class CreateSpeakingTestDto {
  @IsOptional() @IsUUID() creationRequestId?: string;

  @IsOptional()
  @IsIn(['EXAM', 'PRACTICE'])
  purpose?: TestPurpose;

  @IsIn(['part1', 'part2', 'part3', 'part4', 'full'])
  mode!: SpeakingTestMode;

  @IsObject()
  details!: SpeakingTestAggregate['details'];

  @IsObject()
  parts!: SpeakingTestAggregate['parts'];
}

export class UpdateSpeakingTestDto extends CreateSpeakingTestDto {
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  version!: number;
}

export class PublishSpeakingTestDto {
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  version!: number;
}
