import { ApiProperty } from '@nestjs/swagger';
import { Transform, TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class SendMessageInput {
  @ApiProperty({
    example: '019b9d80-7a2e-7b4b-8dc1-7a44b63001c1',
    description: 'Client-generated UUID for idempotency',
  })
  @IsUUID()
  clientMessageId!: string;

  @ApiProperty({
    example: 'Kak, harga kopi susu gula aren berapa?',
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  message!: string;
}
