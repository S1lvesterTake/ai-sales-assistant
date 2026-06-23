import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { Logger } from 'nestjs-pino';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: Logger) {}

  use(request: Request, response: Response, next: NextFunction): void {
    response.on('finish', () => {
      this.logger.log(
        {
          event: 'http_request',
          correlationId: request.correlationId,
          method: request.method,
          path: request.path,
          statusCode: response.statusCode,
          durationMs: Date.now() - request.requestStartedAt,
        },
        RequestLoggingMiddleware.name,
      );
    });
    next();
  }
}
