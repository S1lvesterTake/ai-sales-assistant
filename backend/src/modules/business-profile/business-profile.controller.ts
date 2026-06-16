import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
import { BusinessProfileService } from './business-profile.service';
import { BusinessProfileEnvelopeDto } from './dto/business-profile-response.dto';
import { CreateBusinessProfileDto } from './dto/create-business-profile.dto';
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';

@ApiTags('Business Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('business-profile')
export class BusinessProfileController {
  constructor(private readonly service: BusinessProfileService) {}

  @Post()
  @ResponseMessage('Business profile created successfully')
  @ApiOperation({ summary: 'Create the authenticated owner business profile' })
  @ApiCreatedResponse({ type: BusinessProfileEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  create(
    @CurrentUser() principal: AuthenticatedUser,
    @Body() input: CreateBusinessProfileDto,
  ) {
    return this.service.create(principal.userId, input);
  }

  @Get()
  @ResponseMessage('Business profile retrieved successfully')
  @ApiOperation({ summary: 'Get the authenticated owner business profile' })
  @ApiOkResponse({ type: BusinessProfileEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  get(@CurrentUser() principal: AuthenticatedUser) {
    return this.service.getPrivate(principal.userId);
  }

  @Patch()
  @ResponseMessage('Business profile updated successfully')
  @ApiOperation({ summary: 'Update mutable business profile fields' })
  @ApiOkResponse({ type: BusinessProfileEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  update(
    @CurrentUser() principal: AuthenticatedUser,
    @Body() input: UpdateBusinessProfileDto,
  ) {
    return this.service.update(principal, input);
  }
}
