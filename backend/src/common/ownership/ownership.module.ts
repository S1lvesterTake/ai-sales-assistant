import { Global, Module } from '@nestjs/common';
import { BusinessOwnershipService } from './business-ownership.service';

@Global()
@Module({
  providers: [BusinessOwnershipService],
  exports: [BusinessOwnershipService],
})
export class OwnershipModule {}
