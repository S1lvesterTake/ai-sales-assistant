export interface BootstrapEnvironment {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
}

const allowedNodeEnvironments = new Set(['development', 'test', 'production']);

export function readBootstrapEnvironment(
  environment: NodeJS.ProcessEnv,
): BootstrapEnvironment {
  const nodeEnv = environment.NODE_ENV ?? 'development';
  if (!allowedNodeEnvironments.has(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  const rawPort = environment.PORT ?? '3001';
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return {
    nodeEnv: nodeEnv as BootstrapEnvironment['nodeEnv'],
    port,
  };
}
