import { IsIn } from 'class-validator';
export class MistakeExplanationQueryDto {
  @IsIn(['vi', 'en']) locale: 'vi' | 'en' = 'vi';
}
