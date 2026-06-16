import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto';
import { WhatsappService } from './whatsapp.service';
import { TrackWhatsappClickInput } from './dto/whatsapp-click.dto';
import { WhatsappClickEnvelopeDto } from './dto/whatsapp-click.dto';
import { WhatsappLinkEnvelopeDto } from './dto/whatsapp-link.dto';
import { WhatsappLinkQueryDto } from './dto/whatsapp-link-query.dto';

@ApiTags('Public WhatsApp')
@Controller('public/businesses/:businessSlug')
export class WhatsappController {
  constructor(private readonly service: WhatsappService) {}

  @Get('whatsapp/link')
  @ResponseMessage('WhatsApp link generated successfully')
  @ApiHeader({
    name: 'X-Chat-Session-Token',
    required: false,
    description: 'Required only when sessionId or leadId is provided',
  })
  @ApiOperation({ summary: 'Generate a WhatsApp wa.me link for a business' })
  @ApiOkResponse({ type: WhatsappLinkEnvelopeDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  getLink(
    @Param('businessSlug') businessSlug: string,
    @Query() query: WhatsappLinkQueryDto,
    @Headers('x-chat-session-token') token?: string,
  ) {
    return this.service.generateLink(
      businessSlug,
      query.sessionId,
      query.leadId,
      token,
    );
  }

  @Post('whatsapp-clicks')
  @ResponseMessage('WhatsApp click recorded successfully')
  @ApiHeader({
    name: 'X-Chat-Session-Token',
    required: false,
    description: 'Required only when sessionId or leadId is provided',
  })
  @ApiOperation({ summary: 'Record a WhatsApp link click event' })
  @ApiCreatedResponse({ type: WhatsappClickEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  trackClick(
    @Param('businessSlug') businessSlug: string,
    @Body() input: TrackWhatsappClickInput,
    @Headers('x-chat-session-token') token?: string,
  ) {
    return this.service.trackClick(
      businessSlug,
      input.sessionId,
      input.leadId,
      token,
    );
  }
}
