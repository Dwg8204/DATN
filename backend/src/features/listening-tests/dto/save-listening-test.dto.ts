import { IsIn, IsInt, IsObject, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { TestPurpose } from '../../../common/tests/test-purpose';
import { ListeningTestAggregate, ListeningTestMode } from '../types/listening-test.type';

export class CreateListeningTestDto {
  @IsOptional() @IsUUID() creationRequestId?: string;

  @IsOptional()
  @IsIn(['EXAM', 'PRACTICE'])
  purpose?: TestPurpose;

  @IsIn(['part1', 'part2', 'part3', 'part4', 'full'])
  mode!: ListeningTestMode;

  @IsObject()
  details!: ListeningTestAggregate['details'];

  @IsObject()
  parts!: ListeningTestAggregate['parts'];
}

export class UpdateListeningTestDto extends CreateListeningTestDto {
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  version!: number;
}

export class PublishListeningTestDto {
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  version!: number;
}
