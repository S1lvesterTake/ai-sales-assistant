import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadEnvelopeDto } from './dto/lead-response.dto';
import { LeadQueryDto } from './dto/lead-query.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ResponseMessage('Lead created successfully')
  @ApiOperation({ summary: 'Create a lead manually via JWT' })
  @ApiCreatedResponse({ type: LeadEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  create(
    @CurrentUser() principal: AuthenticatedUser,
    @Body() input: CreateLeadDto,
  ) {
    return this.service.createViaJwt(principal.userId, input);
  }

  @Post('from-chat/:businessSlug')
  @ResponseMessage('Lead created successfully')
  @ApiHeader({
    name: 'X-Chat-Session-Token',
    required: true,
  })
  @ApiOperation({
    summary: 'Create a lead from public chat with session token',
  })
  @ApiCreatedResponse({ type: LeadEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  createFromChat(
    @Param('businessSlug') businessSlug: string,
    @Body() input: CreateLeadDto,
    @Headers('x-chat-session-token') chatToken?: string,
  ) {
    if (!chatToken) throw this.missingAuth();
    if (!input.chatSessionId) throw this.missingChatSessionId();

    return this.service.createViaChatToken(
      businessSlug,
      input.chatSessionId,
      chatToken,
      input,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ResponseMessage('Leads retrieved successfully')
  @ApiOperation({
    summary: 'List leads with pagination, search, and status filter',
  })
  @ApiOkResponse({ type: LeadEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  list(
    @CurrentUser() principal: AuthenticatedUser,
    @Query() query: LeadQueryDto,
  ) {
    return this.service.list(principal.userId, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ResponseMessage('Lead retrieved successfully')
  @ApiOperation({ summary: 'Get a single lead by ID' })
  @ApiOkResponse({ type: LeadEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  get(@CurrentUser() principal: AuthenticatedUser, @Param('id') id: string) {
    return this.service.get(principal.userId, id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ResponseMessage('Lead status updated successfully')
  @ApiOperation({ summary: 'Update lead status' })
  @ApiOkResponse({ type: LeadEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  updateStatus(
    @CurrentUser() principal: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: UpdateLeadStatusDto,
  ) {
    return this.service.updateStatus(principal.userId, id, input);
  }

  private missingAuth(): UnauthorizedException {
    return new UnauthorizedException({
      message: 'Autentikasi diperlukan (X-Chat-Session-Token)',
      code: 'MISSING_AUTH',
    });
  }

  private missingChatSessionId(): UnauthorizedException {
    return new UnauthorizedException({
      message: 'chatSessionId diperlukan untuk autentikasi chat token',
      code: 'MISSING_CHAT_SESSION_ID',
    });
  }
}
