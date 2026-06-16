import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappRepository } from './whatsapp.repository';
import { WhatsappService } from './whatsapp.service';

@Module({
  imports: [ChatModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappRepository],
  exports: [WhatsappService],
})
export class WhatsappModule {}
