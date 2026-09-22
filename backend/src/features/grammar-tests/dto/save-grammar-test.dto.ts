import { IsIn, IsInt, IsObject, Max, Min } from 'class-validator';
import { GrammarTestAggregate, GrammarTestMode } from '../types/grammar-test.type';

export class CreateGrammarTestDto {
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
