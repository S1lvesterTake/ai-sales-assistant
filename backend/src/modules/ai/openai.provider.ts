import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AiProvider,
  AiProviderRequest,
  AiProviderResponse,
} from './ai-provider.interface';

interface OpenAiMessage {
  role: 'system' | 'user';
  content: string;
}

interface OpenAiResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly providerName = 'openai';

  constructor(private readonly config: ConfigService) {}

  async generateResponse(
    request: AiProviderRequest,
  ): Promise<AiProviderResponse> {
    const apiKey = this.config.getOrThrow<string>('OPENAI_API_KEY');
    const model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
    const timeoutMs = this.config.get<number>('AI_TIMEOUT_MS') ?? 8_000;

    const messages: OpenAiMessage[] = [
      { role: 'system', content: request.systemPrompt },
      {
        role: 'user',
        content: `${request.context}\n\nPesan Customer:\n${request.userMessage}`,
      },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 500,
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(
          `OpenAI API error ${response.status}: ${response.statusText}`,
        );
      }

      const body = (await response.json()) as OpenAiResponse;
      const content = body.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('OpenAI returned empty response content');
      }

      return { message: content.trim() };
    } finally {
      clearTimeout(timeout);
    }
  }
}
