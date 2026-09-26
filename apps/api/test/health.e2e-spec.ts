import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { HealthModule } from '../src/health/health.module.js';
import { DatabaseService } from '../src/infrastructure/database/database.service.js';
import { RedisService } from '../src/infrastructure/redis/redis.service.js';
import { configureApp } from '../src/configure-app.js';

describe('health HTTP contract', () => {
  let app: INestApplication;
  const database = { $queryRaw: vi.fn() };
  const redis = { enabled: false, ping: vi.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [HealthModule] })
      .overrideProvider(DatabaseService)
      .useValue(database)
      .overrideProvider(RedisService)
      .useValue(redis)
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });
  beforeEach(() => {
    vi.resetAllMocks();
    database.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    redis.enabled = false;
    redis.ping.mockResolvedValue('PONG');
  });
  afterAll(async () => {
    await app.close();
  });

  it('keeps liveness independent of database outages', async () => {
    database.$queryRaw.mockRejectedValue(
      new Error('postgresql://private-secret'),
    );
    await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .expect(200, { status: 'ok' });
    expect(database.$queryRaw).not.toHaveBeenCalled();
  });
  it('checks PostgreSQL and skips disabled Redis', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(200);
    expect(response.body.details.postgres.status).toBe('up');
    expect(response.body.details.redis).toBeUndefined();
    expect(redis.ping).not.toHaveBeenCalled();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
  it('returns 503 without credentials on database failure', async () => {
    database.$queryRaw.mockRejectedValue(
      new Error('postgresql://private-secret'),
    );
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(503);
    expect(response.body.details.postgres.status).toBe('down');
    expect(response.text).not.toContain('private-secret');
  });
  it('checks enabled Redis', async () => {
    redis.enabled = true;
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(200);
    expect(response.body.details.redis.status).toBe('up');
  });
  it('reports an enabled Redis outage', async () => {
    redis.enabled = true;
    redis.ping.mockRejectedValue(new Error('redis://private-secret'));
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(503);
    expect(response.body.details.redis.status).toBe('down');
    expect(response.text).not.toContain('private-secret');
  });
});
