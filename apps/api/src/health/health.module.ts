import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseModule } from '../infrastructure/database/database.module.js';
import { RedisModule } from '../infrastructure/redis/redis.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [TerminusModule, DatabaseModule, RedisModule],
  controllers: [HealthController],
})
export class HealthModule {}
