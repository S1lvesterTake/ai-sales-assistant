import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

interface SuccessEnvelope<T> {
  success: true;
  message: string;
  data: T;
}

function isEnvelope(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof value.success === 'boolean'
  );
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  T | SuccessEnvelope<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<T | SuccessEnvelope<T>> {
    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'Request completed successfully';

    return next.handle().pipe(
      map((data) => {
        if (isEnvelope(data)) {
          const env = data as unknown as Record<string, unknown>;
          return ('message' in env ? env : { ...env, message }) as unknown as T;
        }
        return { success: true, message, data };
      }),
    );
  }
}
