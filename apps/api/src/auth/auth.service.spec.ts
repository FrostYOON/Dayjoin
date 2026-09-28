import { generateKeyPairSync, sign } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';

const key = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const otherKey = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const uid = 'e8d72db0-24c1-44e0-a2a3-6b86f2d26d6b';
const publicKey = {
  ...key.publicKey.export({ format: 'jwk' }),
  kid: 'current',
  alg: 'ES256',
  use: 'sig',
};
const encode = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

describe('Supabase token verification', () => {
  let service: AuthService;
  let issuer: string;
  let confirmed: boolean;
  let userId: string;
  let unavailable: boolean;
  let removed: boolean;
  let publishedKeys: object[];
  const payload = () => ({
    iss: issuer,
    aud: 'authenticated',
    sub: uid,
    role: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 900,
    iat: Math.floor(Date.now() / 1000),
  });
  const token = (
    claims: Record<string, unknown> = payload(),
    signer = key.privateKey,
    kid = 'current',
  ) => {
    const content = `${encode({ alg: 'ES256', typ: 'JWT', kid })}.${encode(claims)}`;
    return `${content}.${sign('sha256', Buffer.from(content), { key: signer, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
  };
  beforeEach(() => {
    const url = `https://${crypto.randomUUID()}.example`;
    issuer = `${url}/auth/v1`;
    confirmed = true;
    userId = uid;
    unavailable = false;
    removed = false;
    publishedKeys = [publicKey];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        if (unavailable)
          return Response.json(
            { message: 'private upstream details' },
            { status: 503 },
          );
        if (String(input).endsWith('/.well-known/jwks.json'))
          return Response.json({ keys: publishedKeys });
        if (removed)
          return Response.json(
            { code: 'user_not_found', message: 'User not found' },
            { status: 401 },
          );
        return Response.json({
          id: userId,
          email: 'person@example.test',
          email_confirmed_at: confirmed ? '2026-09-27T00:00:00Z' : null,
          user_metadata: { display_name: '지우', role: 'admin' },
        });
      }),
    );
    service = new AuthService(
      new ConfigService({
        SUPABASE_URL: url,
        SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());
  it('verifies an actual signature and only returns a safe display profile', async () => {
    await expect(service.authenticate(token())).resolves.toEqual({
      id: uid,
      email: 'person@example.test',
      displayName: '지우',
    });
  });
  it('rejects a token signed by another key', async () => {
    await expect(
      service.authenticate(token(payload(), otherKey.privateKey)),
    ).rejects.toMatchObject({ status: 401 });
  });
  it.each([
    { iss: 'https://other-project.example/auth/v1' },
    { aud: 'service_role' },
    { role: 'service_role' },
    { sub: '' },
    { sub: 'not-a-user-id' },
    { exp: 1 },
    { exp: undefined },
    { is_anonymous: true },
    { nbf: 9999999999 },
  ])('rejects invalid claims: %j', async (overrides) => {
    await expect(
      service.authenticate(token({ ...payload(), ...overrides })),
    ).rejects.toMatchObject({ status: 401 });
  });
  it('rejects an unconfirmed user', async () => {
    confirmed = false;
    await expect(service.authenticate(token())).rejects.toMatchObject({
      status: 401,
    });
  });
  it('rejects a mismatch between Auth user and subject', async () => {
    userId = crypto.randomUUID();
    await expect(service.authenticate(token())).rejects.toMatchObject({
      status: 401,
    });
  });
  it('fails closed when the provider is unavailable', async () => {
    unavailable = true;
    await expect(service.authenticate(token())).rejects.toMatchObject({
      status: 503,
    });
  });
  it('fetches a newly rotated signing key', async () => {
    await expect(service.authenticate(token())).resolves.toMatchObject({
      id: uid,
    });
    publishedKeys = [
      publicKey,
      {
        ...otherKey.publicKey.export({ format: 'jwk' }),
        kid: 'next',
        alg: 'ES256',
        use: 'sig',
      },
    ];
    await expect(
      service.authenticate(token(payload(), otherKey.privateKey, 'next')),
    ).resolves.toMatchObject({ id: uid });
  });
  it('rejects a deleted user even with a valid signed token', async () => {
    removed = true;
    await expect(service.authenticate(token())).rejects.toMatchObject({
      status: 401,
    });
  });
  it('fails closed without configured Auth', async () => {
    const unconfigured = new AuthService(new ConfigService());
    await expect(unconfigured.authenticate(token())).rejects.toMatchObject({
      status: 503,
    });
  });
});
