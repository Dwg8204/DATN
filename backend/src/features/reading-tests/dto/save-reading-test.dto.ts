import { IsIn, IsInt, IsObject, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { TestPurpose } from '../../../common/tests/test-purpose';
import { ReadingTestAggregate, ReadingTestMode } from '../types/reading-test.type';

export class CreateReadingTestDto {
  @IsOptional() @IsUUID() creationRequestId?: string;

  @IsOptional() @IsIn(['EXAM', 'PRACTICE']) purpose?: TestPurpose;
  @IsIn(['part1', 'part2', 'part3', 'part4', 'full']) mode!: ReadingTestMode;
  @IsObject() details!: ReadingTestAggregate['details'];
  @IsObject() parts!: ReadingTestAggregate['parts'];
}
export class UpdateReadingTestDto extends CreateReadingTestDto {
  @IsInt() @Min(1) @Max(2_147_483_647) version!: number;
}
export class PublishReadingTestDto {
  @IsInt() @Min(1) @Max(2_147_483_647) version!: number;
}
