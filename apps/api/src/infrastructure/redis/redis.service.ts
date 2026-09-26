import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client?: ReturnType<typeof createClient>;
  private connectedOnce = false;
  readonly enabled: boolean;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    this.enabled = config.getOrThrow<boolean>('REDIS_ENABLED');
  }

  async onModuleInit() {
    if (!this.enabled) return;
    this.client = createClient({
      url: this.config.getOrThrow<string>('REDIS_URL'),
      disableOfflineQueue: true,
      socket: {
        connectTimeout: 2000,
        reconnectStrategy: (retries) =>
          !this.connectedOnce && retries >= 3
            ? false
            : Math.min(100 * 2 ** Math.min(retries, 4), 1000),
      },
    });
    this.client.on('error', () =>
      this.logger.warn('Redis connection unavailable'),
    );
    try {
      await this.client.connect();
      this.connectedOnce = true;
    } catch {
      if (this.client.isOpen) this.client.destroy();
      throw new Error('Redis connection failed');
    }
  }

  async ping() {
    if (!this.client?.isReady) throw new Error('Redis is not ready');
    return this.client.withAbortSignal(AbortSignal.timeout(2000)).ping();
  }

  onModuleDestroy() {
    // This client is reserved for disposable cache data, not durable jobs.
    if (this.client?.isOpen) this.client.destroy();
  }
}
