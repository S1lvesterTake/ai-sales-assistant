import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

function makeInterceptor(message: string | null = 'OK') {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(message),
  } as unknown as Reflector;
  return new ResponseInterceptor(reflector);
}

function makeContext(): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;
}

function call(
  interceptor: ResponseInterceptor<unknown>,
  ctx: ExecutionContext,
  value: unknown,
): Promise<unknown> {
  return new Promise((resolve) => {
    interceptor
      .intercept(ctx, { handle: () => of(value) })
      .subscribe((result) => resolve(result));
  });
}

describe('ResponseInterceptor', () => {
  it('wraps a plain value in { success, message, data }', async () => {
    const interceptor = makeInterceptor('OK');
    const ctx = makeContext();

    const result = await call(interceptor, ctx, { id: 1 });

    expect(result).toEqual({ success: true, message: 'OK', data: { id: 1 } });
  });

  it('passes through an existing envelope unchanged when it has a message', async () => {
    const interceptor = makeInterceptor('OK');
    const ctx = makeContext();
    const envelope = { success: true, message: 'already wrapped', data: [] };

    const result = await call(interceptor, ctx, envelope);

    expect(result).toEqual(envelope);
  });

  it('adds message to an envelope that is missing one', async () => {
    const interceptor = makeInterceptor('OK');
    const ctx = makeContext();
    const envelope = { success: true, data: [] };

    const result = await call(interceptor, ctx, envelope);

    expect(result).toMatchObject({ success: true, message: 'OK', data: [] });
  });

  it('falls back to default message when reflector returns null', async () => {
    const interceptor = makeInterceptor(null);
    const ctx = makeContext();

    const result = await call(interceptor, ctx, { x: 1 });

    expect(result).toMatchObject({ message: 'Request completed successfully' });
  });

  it('wraps null data correctly', async () => {
    const interceptor = makeInterceptor('OK');
    const ctx = makeContext();

    const result = await call(interceptor, ctx, null);

    expect(result).toEqual({ success: true, message: 'OK', data: null });
  });
});
