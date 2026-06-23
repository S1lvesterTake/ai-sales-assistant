jest.mock('@sentry/nestjs', () => ({ captureException: jest.fn() }));

import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';
import { ErrorLogService } from '../../modules/error-log/error-log.service';
import { Logger } from 'nestjs-pino';
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
  } as unknown as Logger;

  const errorLogService = {
    capture: jest.fn().mockResolvedValue(undefined),
  } as unknown as ErrorLogService;

  return new HttpExceptionFilter(logger, errorLogService);
}

describe('HttpExceptionFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  describe('Sentry capture', () => {
    it('calls captureException for a 500 error with correct extra context', () => {
      const filter = makeFilter();
      const { host } = makeHost();
      const exception = new Error('Unhandled crash');

      filter.catch(exception, host);

      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
      expect(Sentry.captureException).toHaveBeenCalledWith(
        exception,
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          extra: expect.objectContaining({
            correlationId: 'abc-123',
            method: 'GET',
            path: '/test',
            statusCode: 500,
          }),
        }),
      );
    });

    it('does not call captureException for a 404 error', () => {
      const filter = makeFilter();
      const { host } = makeHost();
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      filter.catch(exception, host);

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('does not call captureException for a 401 error', () => {
      const filter = makeFilter();
      const { host } = makeHost();
      const exception = new HttpException(
        'Unauthorized',
        HttpStatus.UNAUTHORIZED,
      );

      filter.catch(exception, host);

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('does not call captureException for a 422 validation error', () => {
      const filter = makeFilter();
      const { host } = makeHost();
      const exception = new HttpException(
        { message: 'Validation failed' },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );

      filter.catch(exception, host);

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });
});
