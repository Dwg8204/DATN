import { IsIn, IsOptional, IsDateString, Matches } from "class-validator";
import { PaginationQueryDto } from "../../common/pagination/pagination.dto";
export const RAG_SKILLS = [
  "GRAMMAR_VOCAB",
  "READING",
  "LISTENING",
  "WRITING",
  "SPEAKING",
];
export class ReembedDto {
  @IsOptional() @IsIn(RAG_SKILLS) component?: string;
}
export class RagGapsDto extends PaginationQueryDto {
  @IsOptional() @IsIn(RAG_SKILLS) component?: string;
  @IsOptional() @IsIn(["PLAN", "EXPLAIN", "REPORT"]) feature?: string;
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  from?: string;
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  to?: string;
}
