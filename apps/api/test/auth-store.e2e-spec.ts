import { ConfigService } from '@nestjs/config';
import { AuthenticationStorage } from '@nestjs/authentication';
import { authenticationStoreContract } from '@nestjs/authentication/testing';
import { DatabaseService } from '../src/infrastructure/database/database.service.js';
import { PrismaAuthStore } from '../src/auth/prisma-auth.store.js';

const db = new DatabaseService(
  new ConfigService({
    DATABASE_URL:
      'postgresql://dayjoin_app:local_app_only@127.0.0.1:15432/dayjoin_auth_test',
  }),
);
beforeAll(() => db.$connect());
afterAll(() => db.$disconnect());
const cases = authenticationStoreContract(
  async () => {
    await db.authEmailToken.deleteMany();
    const store = new PrismaAuthStore(db, new AuthenticationStorage());
    Object.defineProperty(store, 'maxPending', { value: 3 });
    return {
      sessions: store,
      emailTokens: store,
      refreshTokens: store,
      mfa: store,
    };
  },
  {
    contracts: ['sessions', 'emailTokens', 'refreshTokens', 'mfa'],
    concurrent: true,
    maxPending: 3,
  },
);
for (const entry of cases) it(entry.name, () => entry.run(), 15000);

it('runs without superuser or bypass-RLS privileges', async () => {
  const [role] = await db.$queryRaw<
    { rolsuper: boolean; rolbypassrls: boolean }[]
  >`
    SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
  expect(role).toEqual({ rolsuper: false, rolbypassrls: false });
  const tables = await db.$queryRaw<
    { relrowsecurity: boolean; relforcerowsecurity: boolean }[]
  >`
    SELECT relrowsecurity, relforcerowsecurity FROM pg_class
    WHERE relname IN ('User', 'AuthSession', 'AuthEmailToken')`;
  expect(tables).toHaveLength(3);
  expect(
    tables.every((row) => row.relrowsecurity && row.relforcerowsecurity),
  ).toBe(true);
});
