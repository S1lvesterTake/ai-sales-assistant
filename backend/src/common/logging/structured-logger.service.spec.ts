import { StructuredLogger } from './structured-logger.service';

describe('StructuredLogger', () => {
  let stdoutSpy: jest.SpyInstance;
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    stderrSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  const logger = new StructuredLogger();

  it('log() writes a JSON entry to stdout', () => {
    logger.log({ event: 'test' }, 'TestContext');

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const written = stdoutSpy.mock.calls[0]?.[0] as string;
    const entry = JSON.parse(written) as Record<string, unknown>;
    expect(entry.level).toBe('log');
    expect(entry.context).toBe('TestContext');
    expect(entry.event).toBe('test');
  });

  it('error() writes to stderr', () => {
    logger.error('something broke', 'stack trace', 'ErrCtx');

    expect(stderrSpy).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const written = stderrSpy.mock.calls[0]?.[0] as string;
    const entry = JSON.parse(written) as Record<string, unknown>;
    expect(entry.level).toBe('error');
    expect(entry.trace).toBe('stack trace');
  });

  it('warn() writes to stderr', () => {
    logger.warn('a warning');

    expect(stderrSpy).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const written = stderrSpy.mock.calls[0]?.[0] as string;
    const entry = JSON.parse(written) as Record<string, unknown>;
    expect(entry.level).toBe('warn');
  });

  it('debug() writes to stdout', () => {
    logger.debug('debug message');

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
  });

  it('verbose() writes to stdout', () => {
    logger.verbose('verbose message');

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
  });

  it('fatal() writes to stderr', () => {
    logger.fatal('fatal error', 'trace');

    expect(stderrSpy).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const written = stderrSpy.mock.calls[0]?.[0] as string;
    const entry = JSON.parse(written) as Record<string, unknown>;
    expect(entry.level).toBe('fatal');
  });

  it('converts a string message to { message: string }', () => {
    logger.log('simple string');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const written = stdoutSpy.mock.calls[0]?.[0] as string;
    const entry = JSON.parse(written) as Record<string, unknown>;
    expect(entry.message).toBe('simple string');
  });

  it('omits context and trace keys when not provided', () => {
    logger.log({ event: 'no-ctx' });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const written = stdoutSpy.mock.calls[0]?.[0] as string;
    const entry = JSON.parse(written) as Record<string, unknown>;
    expect(entry).not.toHaveProperty('context');
    expect(entry).not.toHaveProperty('trace');
  });
});
