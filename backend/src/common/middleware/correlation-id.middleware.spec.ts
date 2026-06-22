import type { NextFunction, Request, Response } from 'express';
import {
  applyCorrelationId,
  CorrelationIdMiddleware,
} from './correlation-id.middleware';

function makeReq(headerValue?: string): Request {
  return {
    header: jest.fn().mockReturnValue(headerValue),
    correlationId: '',
    requestStartedAt: 0,
  } as unknown as Request;
}

function makeRes(): Response {
  return {
    setHeader: jest.fn(),
  } as unknown as Response;
}

describe('CorrelationIdMiddleware', () => {
  it('uses the supplied x-correlation-id when it is valid', () => {
    const req = makeReq('my-valid-id');
    const res = makeRes();
    const next: NextFunction = jest.fn();

    applyCorrelationId(req, res, next);

    expect(req.correlationId).toBe('my-valid-id');
    expect(next).toHaveBeenCalled();
  });

  it('generates a UUID when no x-correlation-id header is present', () => {
    const req = makeReq(undefined);
    const res = makeRes();
    const next: NextFunction = jest.fn();

    applyCorrelationId(req, res, next);

    expect(req.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('generates a UUID when the header contains invalid characters', () => {
    const req = makeReq('<script>xss</script>');
    const res = makeRes();
    const next: NextFunction = jest.fn();

    applyCorrelationId(req, res, next);

    expect(req.correlationId).not.toBe('<script>xss</script>');
    expect(req.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('sets requestStartedAt on the request', () => {
    const req = makeReq();
    const res = makeRes();
    const next: NextFunction = jest.fn();
    const before = Date.now();

    applyCorrelationId(req, res, next);

    expect(req.requestStartedAt).toBeGreaterThanOrEqual(before);
  });

  it('sets X-Correlation-ID response header', () => {
    const req = makeReq('header-id');
    const res = makeRes();
    const next: NextFunction = jest.fn();

    applyCorrelationId(req, res, next);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'header-id');
  });

  it('middleware class delegates to applyCorrelationId', () => {
    const middleware = new CorrelationIdMiddleware();
    const req = makeReq('mid-id');
    const res = makeRes();
    const next: NextFunction = jest.fn();

    middleware.use(req, res, next);

    expect(req.correlationId).toBe('mid-id');
  });
});
