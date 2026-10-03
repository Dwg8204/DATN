import { IsIn, IsInt, IsObject, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { TestPurpose } from '../../../common/tests/test-purpose';
import { GrammarTestAggregate, GrammarTestMode } from '../types/grammar-test.type';

export class CreateGrammarTestDto {
  @IsOptional() @IsUUID() creationRequestId?: string;

  @IsOptional()
  @IsIn(['EXAM', 'PRACTICE'])
  purpose?: TestPurpose;

  @IsIn(['part1', 'part2', 'full'])
  mode!: GrammarTestMode;

  @IsObject()
  details!: GrammarTestAggregate['details'];

  @IsObject()
  parts!: GrammarTestAggregate['parts'];
}

export class UpdateGrammarTestDto extends CreateGrammarTestDto {
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  version!: number;
}

export class PublishGrammarTestDto {
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  version!: number;
}
