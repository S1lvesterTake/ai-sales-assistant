import { readBootstrapEnvironment } from './bootstrap-env';

describe('readBootstrapEnvironment', () => {
  it('uses safe local defaults', () => {
    expect(readBootstrapEnvironment({})).toEqual({
      nodeEnv: 'development',
      port: 3001,
    });
  });

  it('accepts an explicit valid environment', () => {
    expect(
      readBootstrapEnvironment({ NODE_ENV: 'production', PORT: '8080' }),
    ).toEqual({ nodeEnv: 'production', port: 8080 });
  });

  it.each(['0', '65536', 'abc', '1.5'])('rejects invalid port %s', (port) => {
    expect(() => readBootstrapEnvironment({ PORT: port })).toThrow(
      'PORT must be an integer between 1 and 65535',
    );
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => readBootstrapEnvironment({ NODE_ENV: 'staging' })).toThrow(
      'NODE_ENV must be development, test, or production',
    );
  });
});
