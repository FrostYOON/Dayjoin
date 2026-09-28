import { Test } from '@nestjs/testing';
import { type INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module.js';
import { AuthService } from '../src/auth/auth.service.js';
import { configureApp } from '../src/configure-app.js';

describe('Auth HTTP boundary', () => {
  let app: INestApplication;
  const authenticate = vi.fn();
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AuthModule] })
      .overrideProvider(AuthService)
      .useValue({ authenticate })
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });
  beforeEach(() => {
    authenticate.mockReset();
  });
  afterAll(async () => {
    await app.close();
  });
  it.each(['', 'Basic abc', 'Bearer', 'Bearer one,two', 'Bearer one two'])(
    'rejects malformed authorization: %s',
    async (authorization) => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', authorization)
        .expect(401);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(authenticate).not.toHaveBeenCalled();
    },
  );
  it('does not accept a token in the query string', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/me?access_token=anything')
      .expect(401);
    expect(authenticate).not.toHaveBeenCalled();
  });
  it('does not expose an invalid token in an error', async () => {
    authenticate.mockRejectedValue(new UnauthorizedException());
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer private-token')
      .expect(401);
    expect(response.text).not.toContain('private-token');
  });
  it('returns only the verified user and disables caching', async () => {
    const user = {
      id: 'user-id',
      email: 'person@example.test',
      displayName: '지우',
    };
    authenticate.mockResolvedValue(user);
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer valid-token')
      .expect(200, user);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(authenticate).toHaveBeenCalledWith('valid-token');
  });
});
