import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { ApiErrorResponseDto } from '../../common/dto/api-error-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { DashboardSummaryEnvelopeDto } from './dto/dashboard-response.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  @ResponseMessage('Dashboard summary retrieved')
  @ApiOperation({ summary: 'Get aggregate dashboard summary' })
  @ApiOkResponse({ type: DashboardSummaryEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  getSummary(@CurrentUser() principal: AuthenticatedUser) {
    return this.service.getSummary(principal.userId);
  }

  @Get('recent-leads')
  @ResponseMessage('Recent leads retrieved')
  @ApiOperation({ summary: 'Get recent leads (default 5, max 20)' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  getRecentLeads(
    @CurrentUser() principal: AuthenticatedUser,
    @Query('limit') limit?: string,
  ) {
    return this.service.getRecentLeads(
      principal.userId,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('recent-conversations')
  @ResponseMessage('Recent conversations retrieved')
  @ApiOperation({ summary: 'Get recent conversations (default 5, max 20)' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  getRecentConversations(
    @CurrentUser() principal: AuthenticatedUser,
    @Query('limit') limit?: string,
  ) {
    return this.service.getRecentConversations(
      principal.userId,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('top-questions')
  @ResponseMessage('Top questions retrieved')
  @ApiOperation({ summary: 'Get top customer questions (default 5, max 20)' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  getTopQuestions(
    @CurrentUser() principal: AuthenticatedUser,
    @Query('limit') limit?: string,
  ) {
    return this.service.getTopQuestions(
      principal.userId,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('conversations/:sessionId/messages')
  @ResponseMessage('Conversation messages retrieved')
  @ApiOperation({ summary: 'Get paginated messages for an owner conversation' })
  @ApiOkResponse()
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  getConversationMessages(
    @CurrentUser() principal: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getConversationMessages(
      principal.userId,
      sessionId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }
}
