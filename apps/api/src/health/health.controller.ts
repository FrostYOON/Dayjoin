import { Controller, Get, Inject } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { DatabaseService } from '../infrastructure/database/database.service.js';
import { RedisService } from '../infrastructure/redis/redis.service.js';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(HealthCheckService) private readonly health: HealthCheckService,
    @Inject(HealthIndicatorService)
    private readonly indicators: HealthIndicatorService,
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    const checks = [
      () => this.check('postgres', () => this.database.$queryRaw`SELECT 1`),
    ];
    if (this.redis.enabled)
      checks.push(() => this.check('redis', () => this.redis.ping()));
    return this.health.check(checks);
  }

  private async check(key: string, probe: () => Promise<unknown>) {
    const indicator = this.indicators.check(key);
    try {
      await probe();
      return indicator.up();
    } catch {
      return indicator.down();
    }
  }
}
