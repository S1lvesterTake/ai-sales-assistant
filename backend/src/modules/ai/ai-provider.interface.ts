export interface AiProviderRequest {
  systemPrompt: string;
  context: string;
  userMessage: string;
}

export interface AiProviderResponse {
  message: string;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AiProvider {
  generateResponse(request: AiProviderRequest): Promise<AiProviderResponse>;
  readonly providerName: string;
}
