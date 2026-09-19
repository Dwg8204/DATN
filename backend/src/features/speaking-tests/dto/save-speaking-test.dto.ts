import { IsIn, IsInt, IsObject, Max, Min } from 'class-validator';
import { SpeakingTestAggregate, SpeakingTestMode } from '../types/speaking-test.type';

export class CreateSpeakingTestDto {
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
