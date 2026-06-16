import { ApiProperty } from '@nestjs/swagger';

export class ApiSuccessResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 'Request completed successfully' })
  message!: string;
}
