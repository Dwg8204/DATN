import { Transform } from 'class-transformer';
import { Matches, MaxLength, MinLength } from 'class-validator';

export class SuggestWordsQueryDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z]+(?:[ '-][a-z]+)*$/, { message: 'Enter a valid English word or phrase.' })
  q!: string;
}
