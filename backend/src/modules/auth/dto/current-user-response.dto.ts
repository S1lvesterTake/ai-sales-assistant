import { ApiProperty } from '@nestjs/swagger';

export class CurrentUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Pemilik Kopi Senja' })
  name!: string;

  @ApiProperty({ example: 'demo@kopisenja.id' })
  email!: string;

  @ApiProperty({ example: true })
  isDemo!: boolean;
}
