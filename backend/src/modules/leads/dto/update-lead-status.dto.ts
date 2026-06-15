import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

const VALID_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'closed',
  'lost',
] as const;

export class UpdateLeadStatusDto {
  @ApiProperty({
    example: 'contacted',
    enum: VALID_STATUSES,
  })
  @IsString()
  @IsIn(VALID_STATUSES)
  status!: (typeof VALID_STATUSES)[number];
}
