import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto';
import { BusinessProfileService } from './business-profile.service';
import { BusinessSlugParamDto } from './dto/business-slug-param.dto';
import { PublicBusinessEnvelopeDto } from './dto/public-business-response.dto';

@ApiTags('Public Business')
@Controller('public/businesses')
export class PublicBusinessController {
  constructor(private readonly service: BusinessProfileService) {}

  @Get(':businessSlug')
  @ResponseMessage('Public business retrieved successfully')
  @ApiOperation({ summary: 'Resolve public business presentation by slug' })
  @ApiParam({
    name: 'businessSlug',
    example: 'kopi-senja-umkm',
    schema: { maxLength: 100, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
  })
  @ApiOkResponse({ type: PublicBusinessEnvelopeDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  get(@Param() params: BusinessSlugParamDto) {
    return this.service.getPublic(params.businessSlug);
  }
}
