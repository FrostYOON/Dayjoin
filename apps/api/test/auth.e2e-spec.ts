import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { InMemoryMailTransport, MailTransport } from '@nestjs/mail';
import request from 'supertest';
import { PasswordHasher, SessionService } from '@nestjs/authentication';
import { createHash, randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { DatabaseService } from '../src/infrastructure/database/database.service.js';
import { UsersService } from '../src/users/users.service.js';

describe('Nest authentication with real PostgreSQL', () => {
  let app: INestApplication;
  let db: DatabaseService;
  const mail = new InMemoryMailTransport();
  const email = 'auth-' + randomUUID() + '@example.test';
  const password = 'dayjoin-password-123';
  const address = '/api/v1/auth/';
  let cookie = '';
  let verification = '';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL =
      'postgresql://dayjoin_app:local_app_only@127.0.0.1:15432/dayjoin_auth_test';
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailTransport)
      .useValue(mail)
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(DatabaseService);
  });
  afterAll(async () => {
    await app.close();
  });
  it('rejects short passwords and extra fields on the server', async () => {
    await request(app.getHttpServer())
      .post(address + 'sign-up')
      .send({ email, password: 'short', displayName: '테스트' })
      .expect(400);
    await request(app.getHttpServer())
      .post(address + 'sign-up')
      .send({ email, password, displayName: '테스트', role: 'admin' })
      .expect(400);
    expect(await db.user.findUnique({ where: { email } })).toBeNull();
  });
  it('blocks cross-site writes, including public registration', async () => {
    await request(app.getHttpServer())
      .post(address + 'sign-up')
      .set('Origin', 'https://attacker.example')
      .set('Sec-Fetch-Site', 'cross-site')
      .send({ email, password, displayName: '테스트' })
      .expect(403);
  });
  it('persists an unverified account and sends a hashed single-use token', async () => {
    const response = await request(app.getHttpServer())
      .post(address + 'sign-up')
      .send({ email: email.toUpperCase(), password, displayName: '테스트' })
      .expect(202);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.text).not.toContain(password);
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    expect(user.emailVerified).toBe(false);
    expect(user.passwordHash).toMatch(/^\$scrypt\$/);
    verification = mail
      .assertSent({ to: email })
      .link('/auth/verify')
      .searchParams.get('token')!;
    expect(verification).toHaveLength(43);
    const stored = await db.authEmailToken.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(stored.id).not.toBe(verification);
  });
  it('rejects duplicate signup without replacing existing credentials', async () => {
    await request(app.getHttpServer())
      .post(address + 'sign-up')
      .send({ email, password: 'different-password', displayName: '다른 이름' })
      .expect(409);
  });
  it('requires confirmed email and rejects invalid credentials', async () => {
    await request(app.getHttpServer())
      .post(address + 'sign-in')
      .send({ email, password })
      .expect(400);
    await request(app.getHttpServer())
      .post(address + 'sign-in')
      .send({ email, password: 'incorrect' })
      .expect(401);
  });
  it('email links survive GET previews and work only once', async () => {
    await request(app.getHttpServer())
      .get(address + 'email/verify?token=' + verification)
      .expect(404);
    await request(app.getHttpServer())
      .post(address + 'email/verify')
      .send({ token: verification })
      .expect(200);
    await request(app.getHttpServer())
      .post(address + 'email/verify')
      .send({ token: verification })
      .expect(400);
  });
  it('creates an HttpOnly session and preserves it across app restart', async () => {
    const response = await request(app.getHttpServer())
      .post(address + 'sign-in')
      .send({ email, password })
      .expect(200);
    cookie = response.headers['set-cookie'][0].split(';')[0];
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][0]).toContain('SameSite=Lax');
    const me = await request(app.getHttpServer())
      .get(address + 'me')
      .set('Cookie', cookie)
      .expect(200);
    expect(me.body).toEqual({
      id: expect.any(String),
      email,
      displayName: '테스트',
      emailVerified: true,
    });
    expect(me.text).not.toContain('passwordHash');
    await app.close();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailTransport)
      .useValue(mail)
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(DatabaseService);
    await request(app.getHttpServer())
      .get(address + 'me')
      .set('Cookie', cookie)
      .expect(200);
  });
  it('keeps anonymous and forged sessions out', async () => {
    await request(app.getHttpServer())
      .get(address + 'me')
      .expect(401);
    await request(app.getHttpServer())
      .get(address + 'me')
      .set('Cookie', 'sid=forged')
      .expect(401);
  });
  it('invalidates the old cookie on logout', async () => {
    await request(app.getHttpServer())
      .post(address + 'sign-out')
      .set('Cookie', cookie)
      .send({})
      .expect(200);
    await request(app.getHttpServer())
      .get(address + 'me')
      .set('Cookie', cookie)
      .expect(401);
  });
  it('reset changes the password and ends every session', async () => {
    const before = await db.user.findUniqueOrThrow({ where: { email } });
    const credentialFingerprint = createHash('sha256')
      .update(before.passwordHash)
      .digest('hex');
    const login = await request(app.getHttpServer())
      .post(address + 'sign-in')
      .send({ email, password })
      .expect(200);
    cookie = login.headers['set-cookie'][0].split(';')[0];
    const unknown = await request(app.getHttpServer())
      .post(address + 'password/forgot')
      .send({ email: 'absent@example.test' })
      .expect(202);
    const known = await request(app.getHttpServer())
      .post(address + 'password/forgot')
      .send({ email })
      .expect(202);
    expect(known.body).toEqual(unknown.body);
    await vi.waitFor(() =>
      expect(mail.find({ to: email })?.subject).toContain('비밀번호 변경'),
    );
    const token = mail
      .assertSent({ to: email })
      .link('/auth/reset')
      .searchParams.get('token')!;
    await request(app.getHttpServer())
      .post(address + 'password/reset')
      .send({ token, password: 'short' })
      .expect(400);
    await request(app.getHttpServer())
      .post(address + 'password/reset')
      .send({ token, password: 'new-password-12345' })
      .expect(200);
    await request(app.getHttpServer())
      .get(address + 'me')
      .set('Cookie', cookie)
      .expect(401);
    const late = await app
      .get(SessionService)
      .create(before.id, { metadata: { credentialFingerprint } });
    await request(app.getHttpServer())
      .get(address + 'me')
      .set('Cookie', late.cookie.split(';')[0])
      .expect(401);

    await request(app.getHttpServer())
      .post(address + 'password/reset')
      .send({ token, password })
      .expect(400);
    await request(app.getHttpServer())
      .post(address + 'sign-in')
      .send({ email, password })
      .expect(401);
    await request(app.getHttpServer())
      .post(address + 'sign-in')
      .send({ email, password: 'new-password-12345' })
      .expect(200);
  });
  it('a password change wins over a simultaneous hash upgrade', async () => {
    const hasher = app.get(PasswordHasher);
    const users = app.get(UsersService);
    const oldPassword = 'previous-password-123';
    const newPassword = 'replacement-password-456';
    const concurrentEmail = 'concurrent-' + randomUUID() + '@example.test';
    const user = await db.user.create({
      data: {
        email: concurrentEmail,
        displayName: '동시 변경',
        passwordHash: await hasher.hash(oldPassword),
        emailVerified: true,
      },
    });
    const newHash = await hasher.hash(newPassword);
    const realHash = hasher.hash.bind(hasher);
    let reached!: () => void;
    let resume!: () => void;
    const upgrading = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const released = new Promise<void>((resolve) => {
      resume = resolve;
    });
    const rehash = vi.spyOn(hasher, 'needsRehash').mockReturnValue(true);
    const hashing = vi
      .spyOn(hasher, 'hash')
      .mockImplementation(async (value) => {
        reached();
        await released;
        return realHash(value);
      });
    try {
      const pending = request(app.getHttpServer())
        .post(address + 'sign-in')
        .send({ email: concurrentEmail, password: oldPassword })
        .then((response) => response);
      await upgrading;
      await users.updatePassword(user.id, newHash);
      resume();
      expect((await pending).status).toBe(401);
    } finally {
      resume();
      hashing.mockRestore();
      rehash.mockRestore();
    }
    await request(app.getHttpServer())
      .post(address + 'sign-in')
      .send({ email: concurrentEmail, password: oldPassword })
      .expect(401);
    await request(app.getHttpServer())
      .post(address + 'sign-in')
      .send({ email: concurrentEmail, password: newPassword })
      .expect(200);
  });
  it('throttles repeated login attempts', async () => {
    let status = 0;
    for (let n = 0; n < 11; n++)
      status = (
        await request(app.getHttpServer())
          .post(address + 'sign-in')
          .send({ email: 'absent@example.test', password: 'wrong' })
      ).status;
    expect(status).toBe(429);
  });
});
