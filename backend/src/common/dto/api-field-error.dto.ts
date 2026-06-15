import { ApiProperty } from '@nestjs/swagger';

export class ApiFieldErrorDto {
  @ApiProperty({ example: 'price' })
  field!: string;

  @ApiProperty({ example: 'Price must be greater than or equal to 0' })
  message!: string;
}
