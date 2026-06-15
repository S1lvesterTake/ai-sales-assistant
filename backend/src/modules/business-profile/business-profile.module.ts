import { Module } from '@nestjs/common';
import { BusinessProfileController } from './business-profile.controller';
import { BusinessProfileRepository } from './business-profile.repository';
import { BusinessProfileService } from './business-profile.service';
import { PublicBusinessController } from './public-business.controller';

@Module({
  controllers: [BusinessProfileController, PublicBusinessController],
  providers: [BusinessProfileRepository, BusinessProfileService],
  exports: [BusinessProfileRepository, BusinessProfileService],
})
export class BusinessProfileModule {}
