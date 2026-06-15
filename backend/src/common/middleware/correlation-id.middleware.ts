import { randomUUID } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

const correlationIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;

export function applyCorrelationId(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const suppliedId = request.header('x-correlation-id');
  request.correlationId =
    suppliedId && correlationIdPattern.test(suppliedId)
      ? suppliedId
      : randomUUID();
  request.requestStartedAt = Date.now();
  response.setHeader('X-Correlation-ID', request.correlationId);
  next();
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    applyCorrelationId(request, response, next);
  }
}
