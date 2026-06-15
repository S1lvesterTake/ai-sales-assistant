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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductEnvelopeDto } from './dto/product-response.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Post()
  @ResponseMessage('Product created successfully')
  @ApiOperation({ summary: 'Create a new product' })
  @ApiCreatedResponse({ type: ProductEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  create(
    @CurrentUser() principal: AuthenticatedUser,
    @Body() input: CreateProductDto,
  ) {
    return this.service.create(principal.userId, input);
  }

  @Get()
  @ResponseMessage('Products retrieved successfully')
  @ApiOperation({
    summary:
      'List products with pagination, category, and availability filters',
  })
  @ApiOkResponse({ type: ProductEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  list(
    @CurrentUser() principal: AuthenticatedUser,
    @Query() query: ProductQueryDto,
  ) {
    return this.service.list(principal.userId, query);
  }

  @Get(':id')
  @ResponseMessage('Product retrieved successfully')
  @ApiOperation({ summary: 'Get a single product by ID' })
  @ApiOkResponse({ type: ProductEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  get(@CurrentUser() principal: AuthenticatedUser, @Param('id') id: string) {
    return this.service.get(principal.userId, id);
  }

  @Patch(':id')
  @ResponseMessage('Product updated successfully')
  @ApiOperation({ summary: 'Update mutable product fields' })
  @ApiOkResponse({ type: ProductEnvelopeDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  update(
    @CurrentUser() principal: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: UpdateProductDto,
  ) {
    return this.service.update(principal.userId, id, input);
  }

  @Delete(':id')
  @ResponseMessage('Product deleted successfully')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiOkResponse({ type: ProductEnvelopeDto })
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
