import { Injectable } from '@nestjs/common';
import type {
  AiProvider,
  AiProviderRequest,
  AiProviderResponse,
} from './ai-provider.interface';

const DEFAULT_RESPONSE =
  'Halo Kak! Terima kasih sudah menghubungi kami. Ada yang bisa saya bantu?';

@Injectable()
export class FakeAiProvider implements AiProvider {
  readonly providerName = 'fake';

  private nextResponse: string | null = null;
  private shouldFail = false;
  private callCount = 0;

  async generateResponse(
    _request: AiProviderRequest,
  ): Promise<AiProviderResponse> {
    this.callCount += 1;

    if (this.shouldFail) {
      throw new Error('Simulated AI provider failure');
    }

    // Satisfy require-await
    await Promise.resolve();

    void _request;
    const message = this.nextResponse ?? DEFAULT_RESPONSE;
    this.nextResponse = null;
    return { message };
  }

  // Test helpers

  setNextResponse(message: string): void {
    this.nextResponse = message;
  }

  setShouldFail(flag: boolean): void {
    this.shouldFail = flag;
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset(): void {
    this.nextResponse = null;
    this.shouldFail = false;
    this.callCount = 0;
  }
}
