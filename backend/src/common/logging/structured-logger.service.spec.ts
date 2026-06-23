import { Logger } from '@nestjs/common';

describe('Logger (backed by nestjs-pino)', () => {
  it('exposes the required log-level methods', () => {
    const logger = new Logger('TestContext');
    expect(typeof logger.log).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });
});
