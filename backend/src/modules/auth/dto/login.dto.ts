import { ApiProperty } from '@nestjs/swagger';
import { IsByteLength, IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'demo@kopisenja.id' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    example: 'DemoKopiSenja2026!',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @IsByteLength(8, 72)
  password!: string;
}
