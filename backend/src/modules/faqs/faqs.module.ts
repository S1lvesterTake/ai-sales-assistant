import { Module } from '@nestjs/common';
import { FaqsController } from './faqs.controller';
import { FaqsRepository } from './faqs.repository';
import { FaqsService } from './faqs.service';

@Module({
  controllers: [FaqsController],
  providers: [FaqsService, FaqsRepository],
  exports: [FaqsService, FaqsRepository],
})
export class FaqsModule {}
