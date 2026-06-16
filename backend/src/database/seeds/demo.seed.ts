import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { DemoDataCommand, DemoDataService } from './demo-data.service';

function readCommand(value: string | undefined): DemoDataCommand {
  if (value === 'seed' || value === 'reset') return value;
  throw new Error('Usage: demo.seed.js <seed|reset>');
}

async function run(): Promise<void> {
  const command = readCommand(process.argv[2]);
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  try {
    const result = await app.get(DemoDataService).execute(command);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await app.close();
  }
}

void run().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Demo command failed';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
