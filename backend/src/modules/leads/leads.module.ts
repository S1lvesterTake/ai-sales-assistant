import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { LeadsController } from './leads.controller';
import { LeadsRepository } from './leads.repository';
import { LeadsService } from './leads.service';

@Module({
  imports: [ChatModule],
  controllers: [LeadsController],
  providers: [LeadsService, LeadsRepository],
  exports: [LeadsService],
})
export class LeadsModule {}
