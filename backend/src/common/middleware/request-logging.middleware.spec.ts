import type { NextFunction, Request, Response } from 'express';
import { StructuredLogger } from '../logging/structured-logger.service';
import { RequestLoggingMiddleware } from './request-logging.middleware';

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    correlationId: 'test-id',
    method: 'GET',
    path: '/api/test',
    requestStartedAt: Date.now() - 50,
    ...overrides,
  } as unknown as Request;
}

function makeRes(): { res: Response; emitFinish: () => void } {
  let finishCallback: (() => void) | undefined;
  const res = {
    statusCode: 200,
    on: jest.fn((event: string, cb: () => void) => {
      if (event === 'finish') finishCallback = cb;
    }),
  } as unknown as Response;
  return {
    res,
    emitFinish: () => {
      finishCallback?.();
    },
  };
}

describe('RequestLoggingMiddleware', () => {
  it('registers a finish listener and calls next()', () => {
    const logger = { log: jest.fn() } as unknown as StructuredLogger;
    const middleware = new RequestLoggingMiddleware(logger);
    const req = makeReq();
    const { res } = makeRes();
    const next: NextFunction = jest.fn();

    middleware.use(req, res, next);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    expect(next).toHaveBeenCalled();
  });

  it('logs the request details when the response finishes', () => {
    const logger = { log: jest.fn() } as unknown as StructuredLogger;
    const middleware = new RequestLoggingMiddleware(logger);
    const req = makeReq();
    const { res, emitFinish } = makeRes();

    middleware.use(req, res, jest.fn());
    emitFinish();

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'http_request',
        correlationId: 'test-id',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
      }),
      'RequestLoggingMiddleware',
    );
  });
});
