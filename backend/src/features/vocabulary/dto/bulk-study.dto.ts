import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

// Row contents are validated individually so the preview can report every cell error.
export class BulkStudyPreviewDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500)
  rows!: unknown[];
}

export class BulkStudyImportDto extends BulkStudyPreviewDto {
  @IsUUID() clientRequestId!: string;
}
