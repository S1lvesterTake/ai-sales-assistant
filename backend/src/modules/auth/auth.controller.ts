import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { AuthService } from './auth.service';
import {
  AuthResponseDto,
  CurrentUserEnvelopeDto,
} from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ResponseMessage('Registration successful')
  @ApiOperation({ summary: 'Register a non-demo owner account' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  register(@Body() input: RegisterDto) {
    return this.authService.register(input);
  }

  @Post('login')
  @HttpCode(200)
  @ResponseMessage('Login successful')
  @ApiOperation({ summary: 'Login and receive a bearer JWT' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  login(@Body() input: LoginDto) {
    return this.authService.login(input);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ResponseMessage('Current user retrieved successfully')
  @ApiOperation({ summary: 'Get the authenticated user' })
  @ApiOkResponse({ type: CurrentUserEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  async getCurrentUser(@CurrentUser() principal: AuthenticatedUser) {
    const user = await this.authService.getCurrentUser(principal.userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
