import { Injectable, LoggerService } from '@nestjs/common';

type LogLevel = 'debug' | 'error' | 'fatal' | 'log' | 'verbose' | 'warn';

@Injectable()
export class StructuredLogger implements LoggerService {
  log(message: unknown, context?: string): void {
    this.write('log', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  fatal(message: unknown, trace?: string, context?: string): void {
    this.write('fatal', message, context, trace);
  }

  private write(
    level: LogLevel,
    message: unknown,
    context?: string,
    trace?: string,
  ): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      ...(context ? { context } : {}),
      ...(typeof message === 'object' && message !== null
        ? message
        : { message: String(message) }),
      ...(trace ? { trace } : {}),
    };
    const stream = ['error', 'fatal', 'warn'].includes(level)
      ? process.stderr
      : process.stdout;
    stream.write(`${JSON.stringify(entry)}\n`);
  }
}
