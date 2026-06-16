import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_PROVIDER, AiProvider } from './ai-provider.interface';
import { FakeAiProvider } from './fake-ai.provider';
import { OpenAiProvider } from './openai.provider';

@Module({
  providers: [
    {
      provide: AI_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): AiProvider => {
        const providerName = config.get<string>('AI_PROVIDER') ?? 'openai';
        if (providerName === 'fake') {
          return new FakeAiProvider();
        }
        return new OpenAiProvider(config);
      },
    },
  ],
  exports: [AI_PROVIDER],
})
export class AiModule {}
