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
import { ChatService } from './chat.service';
import { ChatSessionEnvelopeDto } from './dto/chat-session-response.dto';
import { ChatHistoryQueryDto } from './dto/chat-history-query.dto';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';

@ApiTags('Public Chat')
@Controller('public/businesses/:businessSlug/chat')
export class ChatController {
  constructor(private readonly service: ChatService) {}

  @Post('sessions')
  @ResponseMessage('Chat session created successfully')
  @ApiOperation({ summary: 'Create a public chat session for a business' })
  @ApiCreatedResponse({ type: ChatSessionEnvelopeDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  createSession(
    @Param('businessSlug') businessSlug: string,
    @Body() input: CreateChatSessionDto,
  ) {
    return this.service.createSession(businessSlug, input);
  }

  @Get('sessions/:sessionId/messages')
  @ResponseMessage('Chat history retrieved successfully')
  @ApiHeader({
    name: 'X-Chat-Session-Token',
    required: true,
    description: 'Raw chat session token from session creation',
  })
  @ApiOperation({ summary: 'Get paginated chat history for a session' })
  @ApiOkResponse({ description: 'Paginated chat messages' })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  getHistory(
    @Param('businessSlug') businessSlug: string,
    @Param('sessionId') sessionId: string,
    @Query() query: ChatHistoryQueryDto,
    @Headers('x-chat-session-token') token: string,
  ) {
    return this.service.getHistory(businessSlug, sessionId, token, query);
  }
}
