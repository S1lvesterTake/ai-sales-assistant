import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatSessionAuthService } from './chat-session-auth.service';
import { ChatSessionsRepository } from './chat-sessions.repository';

@Module({
  controllers: [ChatController],
  providers: [ChatService, ChatSessionAuthService, ChatSessionsRepository],
  exports: [ChatService, ChatSessionAuthService, ChatSessionsRepository],
})
export class ChatModule {}
