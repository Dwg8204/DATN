import { Matches, MaxLength } from 'class-validator';

export class LookupWordParamsDto {
  @MaxLength(60)
  @Matches(/^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/, { message: 'Choose a valid English word or phrase.' })
  word!: string;
}
