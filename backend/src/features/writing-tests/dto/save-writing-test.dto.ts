import { IsIn, IsInt, IsObject, Max, Min } from 'class-validator';
import { WritingTestAggregate, WritingTestMode } from '../types/writing-test.type';

export class CreateWritingTestDto {
  @IsIn(['part1', 'part2', 'part3', 'part4', 'full'])
  mode!: WritingTestMode;

  @IsObject()
  details!: WritingTestAggregate['details'];

  @IsObject()
  parts!: WritingTestAggregate['parts'];
}

export class UpdateWritingTestDto extends CreateWritingTestDto {
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  version!: number;
}

export class PublishWritingTestDto {
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  version!: number;
}

