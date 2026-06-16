import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatProcessingService } from './chat-processing.service';
import { ChatSessionAuthService } from './chat-session-auth.service';
import { ChatSessionsRepository } from './chat-sessions.repository';
import { PromptBuilderService } from './prompt-builder.service';
import { BuyingIntentService } from './buying-intent.service';

@Module({
  imports: [AiModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatProcessingService,
    ChatSessionAuthService,
    ChatSessionsRepository,
    PromptBuilderService,
    BuyingIntentService,
  ],
  exports: [
    ChatService,
    ChatProcessingService,
    ChatSessionAuthService,
    ChatSessionsRepository,
  ],
})
export class ChatModule {}
