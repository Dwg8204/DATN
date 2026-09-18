import { IsIn, IsInt, IsObject, Max, Min } from 'class-validator';
import { ListeningTestAggregate, ListeningTestMode } from '../types/listening-test.type';

export class CreateListeningTestDto {
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
