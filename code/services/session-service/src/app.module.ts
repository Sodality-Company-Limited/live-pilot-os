import { Module } from '@nestjs/common';
import { SessionLifecycleService } from './lifecycle.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  providers: [SessionLifecycleService],
  exports: [SessionLifecycleService],
})
export class AppModule {}
