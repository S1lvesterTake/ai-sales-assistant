import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
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
import { FaqsService } from './faqs.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { FaqEnvelopeDto } from './dto/faq-response.dto';
import { FaqQueryDto } from './dto/faq-query.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

@ApiTags('FAQs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('faqs')
export class FaqsController {
  constructor(private readonly service: FaqsService) {}

  @Post()
  @ResponseMessage('FAQ created successfully')
  @ApiOperation({ summary: 'Create a new FAQ' })
  @ApiCreatedResponse({ type: FaqEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  create(
    @CurrentUser() principal: AuthenticatedUser,
    @Body() input: CreateFaqDto,
  ) {
    return this.service.create(principal.userId, input);
  }

  @Get()
  @ResponseMessage('FAQs retrieved successfully')
  @ApiOperation({
    summary: 'List FAQs with pagination, search, category, and active filters',
  })
  @ApiOkResponse({ type: FaqEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  list(
    @CurrentUser() principal: AuthenticatedUser,
    @Query() query: FaqQueryDto,
  ) {
    return this.service.list(principal.userId, query);
  }

  @Get(':id')
  @ResponseMessage('FAQ retrieved successfully')
  @ApiOperation({ summary: 'Get a single FAQ by ID' })
  @ApiOkResponse({ type: FaqEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  get(@CurrentUser() principal: AuthenticatedUser, @Param('id') id: string) {
    return this.service.get(principal.userId, id);
  }

  @Patch(':id')
  @ResponseMessage('FAQ updated successfully')
  @ApiOperation({ summary: 'Update mutable FAQ fields' })
  @ApiOkResponse({ type: FaqEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  update(
    @CurrentUser() principal: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: UpdateFaqDto,
  ) {
    return this.service.update(principal.userId, id, input);
  }

  @Delete(':id')
  @ResponseMessage('FAQ deleted successfully')
  @ApiOperation({ summary: 'Delete a FAQ' })
  @ApiOkResponse({ type: FaqEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  async remove(
    @CurrentUser() principal: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.service.remove(principal.userId, id);
    return null;
  }
}
