import { Inject, Injectable } from '@nestjs/common';
import {
  AuthenticationStorage,
  type SessionStore,
  type SessionRecord,
  type EmailTokenStore,
  type EmailTokenRecord,
  type EmailTokenPurpose,
  type RefreshTokenStore,
  type RefreshTokenRecord,
  type MfaStore,
  type TotpRecord,
} from '@nestjs/authentication';
import { Prisma } from '../generated/prisma/client.js';
import { DatabaseService } from '../infrastructure/database/database.service.js';

@Injectable()
export class PrismaAuthStore
  implements SessionStore, EmailTokenStore, RefreshTokenStore, MfaStore
{
  readonly maxPending = 1000;
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(AuthenticationStorage) storage: AuthenticationStorage,
  ) {
    storage.registerSource({
      sessions: this,
      emailTokens: this,
      refreshTokens: this,
      mfa: this,
    });
  }

  async getSession(id: string) {
    const row = await this.db.authSession.findUnique({ where: { id } });
    return row ? this.session(row) : undefined;
  }
  async createSession(record: SessionRecord) {
    await this.db.authSession.deleteMany({
      where: { expiresAt: { lte: record.createdAt } },
    });
    await this.db.authSession.create({
      data: {
        ...record,
        metadata: record.metadata
          ? (record.metadata as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
    });
  }
  async touchSession(id: string, lastActiveAt: Date) {
    await this.db.authSession.updateMany({
      where: { id, lastActiveAt: { lt: lastActiveAt } },
      data: { lastActiveAt },
    });
  }
  async deleteSession(id: string) {
    return (await this.db.authSession.deleteMany({ where: { id } })).count > 0;
  }
  async listUserSessions(userId: string) {
    return (await this.db.authSession.findMany({ where: { userId } })).map(
      (row) => this.session(row),
    );
  }
  async deleteUserSessions(userId: string) {
    await this.db.authSession.deleteMany({ where: { userId } });
  }
  private session(row: {
    id: string;
    userId: string;
    createdAt: Date;
    expiresAt: Date;
    lastActiveAt: Date;
    mfa: string | null;
    metadata: Prisma.JsonValue;
  }): SessionRecord {
    return {
      id: row.id,
      userId: row.userId,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      lastActiveAt: row.lastActiveAt,
      ...(row.mfa && { mfa: row.mfa as SessionRecord['mfa'] }),
      ...(row.metadata && {
        metadata: row.metadata as Record<string, unknown>,
      }),
    };
  }

  async saveEmailToken(record: EmailTokenRecord) {
    // Serialize cap/expiry maintenance across API instances, without locking business data.
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(7744201)::text`;
      await tx.authEmailToken.create({ data: record });
      await tx.authEmailToken.deleteMany({
        where: { expiresAt: { lte: record.createdAt } },
      });
      const overflow = await tx.authEmailToken.findMany({
        orderBy: [{ expiresAt: 'desc' }, { id: 'desc' }],
        skip: this.maxPending,
        select: { id: true },
      });
      if (overflow.length)
        await tx.authEmailToken.deleteMany({
          where: { id: { in: overflow.map((row) => row.id) } },
        });
    });
  }
  async consumeEmailToken(id: string, purpose: EmailTokenPurpose) {
    try {
      const row = await this.db.authEmailToken.delete({
        where: { id, purpose },
      });
      return {
        id: row.id,
        purpose: row.purpose as EmailTokenPurpose,
        userId: row.userId,
        email: row.email,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
        ...(row.fingerprint && { fingerprint: row.fingerprint }),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      )
        return undefined;
      throw error;
    }
  }
  async deleteUserEmailTokens(userId: string, purpose: EmailTokenPurpose) {
    await this.db.authEmailToken.deleteMany({ where: { userId, purpose } });
  }

  async getRefreshToken(id: string): Promise<RefreshTokenRecord | undefined> {
    const row = await this.db.authRefreshToken.findUnique({ where: { id } });
    if (!row) return undefined;
    return {
      id: row.id,
      familyId: row.familyId,
      userId: row.userId,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      familyExpiresAt: row.familyExpiresAt,
      ...(row.usedAt && { usedAt: row.usedAt }),
      ...(row.claims && { claims: row.claims as Record<string, unknown> }),
    };
  }
  async saveRefreshToken(record: RefreshTokenRecord) {
    await this.db.authRefreshToken.deleteMany({
      where: { familyExpiresAt: { lte: record.createdAt } },
    });
    await this.db.authRefreshToken.create({
      data: {
        ...record,
        claims: record.claims
          ? (record.claims as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
    });
  }
  async markRefreshTokenUsed(id: string, at: Date) {
    return (
      (
        await this.db.authRefreshToken.updateMany({
          where: { id, usedAt: null },
          data: { usedAt: at },
        })
      ).count > 0
    );
  }
  async revokeRefreshTokenFamily(familyId: string) {
    await this.db.authRevokedFamily.createMany({
      data: [{ id: familyId }],
      skipDuplicates: true,
    });
  }
  async isRefreshTokenFamilyRevoked(familyId: string) {
    return !!(await this.db.authRevokedFamily.findUnique({
      where: { id: familyId },
    }));
  }
  async revokeUserRefreshTokens(userId: string) {
    const families = await this.db.authRefreshToken.findMany({
      where: { userId },
      distinct: ['familyId'],
      select: { familyId: true },
    });
    await this.db.authRevokedFamily.createMany({
      data: families.map((row) => ({ id: row.familyId })),
      skipDuplicates: true,
    });
  }

  async getTotp(userId: string): Promise<TotpRecord | undefined> {
    const row = await this.db.authTotp.findUnique({ where: { userId } });
    if (!row) return undefined;
    return {
      secret: row.secret,
      confirmed: row.confirmed,
      ...(row.pendingSecret !== null && { pendingSecret: row.pendingSecret }),
      ...(row.lastUsedStep !== null && { lastUsedStep: row.lastUsedStep }),
    };
  }
  async saveTotp(userId: string, record: TotpRecord | null) {
    if (!record) {
      await this.db.authTotp.deleteMany({ where: { userId } });
      return;
    }
    await this.db.$executeRaw`
      INSERT INTO "AuthTotp" ("userId", "secret", "confirmed", "pendingSecret", "lastUsedStep")
      VALUES (${userId}, ${record.secret}, ${record.confirmed}, ${record.pendingSecret ?? null}, ${record.lastUsedStep ?? null})
      ON CONFLICT ("userId") DO UPDATE SET
      "secret" = EXCLUDED."secret", "confirmed" = EXCLUDED."confirmed", "pendingSecret" = EXCLUDED."pendingSecret",
      "lastUsedStep" = GREATEST("AuthTotp"."lastUsedStep", EXCLUDED."lastUsedStep")`;
  }
  async claimTotpStep(userId: string, step: number) {
    return (
      (
        await this.db.authTotp.updateMany({
          where: {
            userId,
            OR: [{ lastUsedStep: null }, { lastUsedStep: { lt: step } }],
          },
          data: { lastUsedStep: step },
        })
      ).count > 0
    );
  }
  async saveRecoveryCodes(userId: string, hashes: string[]) {
    await this.db.$transaction([
      this.db.authRecoveryCode.deleteMany({ where: { userId } }),
      this.db.authRecoveryCode.createMany({
        data: hashes.map((hash) => ({ userId, hash })),
        skipDuplicates: true,
      }),
    ]);
  }
  async consumeRecoveryCode(userId: string, hash: string) {
    return (
      (await this.db.authRecoveryCode.deleteMany({ where: { userId, hash } }))
        .count > 0
    );
  }
  countRecoveryCodes(userId: string) {
    return this.db.authRecoveryCode.count({ where: { userId } });
  }
  async recordMfaFailure(userId: string, windowMs: number, now: number) {
    await this.db.authMfaFailure.create({
      data: { userId, at: new Date(now) },
    });
    return this.countMfaFailures(userId, windowMs, now);
  }
  countMfaFailures(userId: string, windowMs: number, now: number) {
    return this.db.authMfaFailure.count({
      where: { userId, at: { gt: new Date(now - windowMs) } },
    });
  }
  async clearMfaFailures(userId: string) {
    await this.db.authMfaFailure.deleteMany({ where: { userId } });
  }
}
