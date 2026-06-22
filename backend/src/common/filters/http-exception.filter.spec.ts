import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ErrorLogService } from '../../modules/error-log/error-log.service';
import { StructuredLogger } from '../logging/structured-logger.service';
import { HttpExceptionFilter } from './http-exception.filter';

function makeHost(reqOverrides: Partial<Request> = {}) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const req = {
    method: 'GET',
    path: '/test',
    correlationId: 'abc-123',
    requestStartedAt: Date.now(),
    ...reqOverrides,
  } as unknown as Request;
  const res = { status, json } as unknown as Response;

  const host = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ArgumentsHost;

  return { host, json, status };
}

function makeFilter() {
  const logger = {
    error: jest.fn(),
  } as unknown as StructuredLogger;

  const errorLogService = {
    capture: jest.fn().mockResolvedValue(undefined),
  } as unknown as ErrorLogService;

  return new HttpExceptionFilter(logger, errorLogService);
}

describe('HttpExceptionFilter', () => {
  it('handles a 404 HttpException with correct status, success=false, and code=NOT_FOUND', () => {
    const filter = makeFilter();
    const { host, status, json } = makeHost();
    const exception = new HttpException(
      'Resource not found',
      HttpStatus.NOT_FOUND,
    );

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: 'NOT_FOUND',
      }),
    );
  });

  it('returns "Invalid request body" for a 400 with JSON in the message', () => {
    const filter = makeFilter();
    const { host, json } = makeHost();
    const exception = new HttpException(
      { message: 'Unexpected token JSON' },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid request body' }),
    );
  });

  it('includes errors array in payload when exception body has errors', () => {
    const filter = makeFilter();
    const { host, json } = makeHost();
    const errors = [{ field: 'name', message: 'Required' }];
    const exception = new HttpException(
      { message: 'Validation failed', errors },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );

    filter.catch(exception, host);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({ errors }));
  });

  it('handles a non-HttpException as 500 with Internal server error message', () => {
    const filter = makeFilter();
    const { host, status, json } = makeHost();
    const exception = new Error('Something went wrong');

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      }),
    );
  });

  it('uses body.code when the exception body provides one', () => {
    const filter = makeFilter();
    const { host, json } = makeHost();
    const exception = new HttpException(
      { message: 'Custom error', code: 'MY_CUSTOM_CODE' },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'MY_CUSTOM_CODE' }),
    );
  });

  it('returns "Too many requests" for 429 regardless of exception message', () => {
    const filter = makeFilter();
    const { host, json } = makeHost();
    const exception = new HttpException(
      'rate limit hit',
      HttpStatus.TOO_MANY_REQUESTS,
    );

    filter.catch(exception, host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Too many requests' }),
    );
  });
});
