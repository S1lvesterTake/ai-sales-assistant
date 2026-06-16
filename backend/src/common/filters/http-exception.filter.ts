import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiFieldErrorDto } from '../dto/api-field-error.dto';
import { StructuredLogger } from '../logging/structured-logger.service';
import { ErrorLogService } from '../../modules/error-log/error-log.service';

interface ExceptionBody {
  code?: string;
  errors?: ApiFieldErrorDto[];
  message?: string | string[];
}

const statusCodes: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
};

function exceptionBody(exception: HttpException): ExceptionBody {
  const response = exception.getResponse();
  return typeof response === 'object' && response !== null
    ? response
    : { message: String(response) };
}

function safeMessage(status: number, body: ExceptionBody): string {
  if (status === 500) {
    return 'Internal server error';
  }
  if (status === 429) {
    return 'Too many requests';
  }
  if (Array.isArray(body.message)) return 'Validation failed';
  if (typeof body.message === 'string') {
    if (status === 400 && body.message.includes('JSON')) {
      return 'Invalid request body';
    }
    return body.message;
  }
  return 'Request failed';
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: StructuredLogger,
    private readonly errorLogService: ErrorLogService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException ? exceptionBody(exception) : {};
    const code = body.code ?? statusCodes[status] ?? 'INTERNAL_ERROR';
    const message = safeMessage(status, body);
    const payload = {
      success: false as const,
      message,
      code,
      ...(body.errors ? { errors: body.errors } : {}),
    };
    const requestStartedAt = request.requestStartedAt ?? Date.now();

    this.logger.error(
      {
        event: 'http_error',
        correlationId: request.correlationId,
        method: request.method,
        path: request.path,
        statusCode: status,
        code,
        durationMs: Date.now() - requestStartedAt,
      },
      status >= 500 && exception instanceof Error ? exception.stack : undefined,
      HttpExceptionFilter.name,
    );
    void this.errorLogService.capture({
      source: 'http',
      message,
      metadata: {
        correlationId: request.correlationId,
        method: request.method,
        path: request.path,
        statusCode: status,
        code,
      },
    });
    response.status(status).json(payload);
  }
}
