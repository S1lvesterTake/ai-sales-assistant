import { ApiProperty } from '@nestjs/swagger';
import { ApiSuccessResponseDto } from '../../../common/dto/api-success-response.dto';
import { CurrentUserResponseDto } from './current-user-response.dto';

export class AuthSessionDto {
  @ApiProperty({
    description: 'Bearer JWT returned only to the trusted caller',
  })
  accessToken!: string;

  @ApiProperty({ example: '2026-06-15T12:00:00.000Z' })
  expiresAt!: string;

  @ApiProperty({ type: CurrentUserResponseDto })
  user!: CurrentUserResponseDto;
}

export class AuthResponseDto extends ApiSuccessResponseDto {
  @ApiProperty({ type: AuthSessionDto })
  data!: AuthSessionDto;
}

export class CurrentUserEnvelopeDto extends ApiSuccessResponseDto {
  @ApiProperty({ type: CurrentUserResponseDto })
  data!: CurrentUserResponseDto;
}
