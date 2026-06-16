import { Transform, TransformFnParams } from 'class-transformer';
import { IsString, Matches, MaxLength } from 'class-validator';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class BusinessSlugParamDto {
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  businessSlug!: string;
}
