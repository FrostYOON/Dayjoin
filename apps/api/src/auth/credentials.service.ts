import { createHash } from 'node:crypto';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';
import { Prisma } from '../generated/prisma/client.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class CredentialsService {
  constructor(
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(PasswordHasher) private readonly hasher: PasswordHasher,
  ) {}
  async register(email: string, password: string, displayName: string) {
    const hash = await this.hasher.hash(password);
    try {
      return await this.users.create(email, displayName, hash);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Email already registered');
      throw error;
    }
  }
  async verify(email: string, password: string) {
    const row = await this.users.findCredentials(email);
    if (!(await this.hasher.verify(password, row?.passwordHash)) || !row)
      return null;
    let hash = row.passwordHash;
    if (this.hasher.needsRehash(hash)) {
      hash = await this.hasher.hash(password);
      // A reset during verification must win over an upgrade of the old password.
      if (
        !(await this.users.upgradePasswordHash(row.id, row.passwordHash, hash))
      )
        return null;
    }
    const { id, displayName, email: storedEmail, emailVerified } = row;
    return {
      id,
      displayName,
      email: storedEmail,
      emailVerified,
      credentialFingerprint: createHash('sha256').update(hash).digest('hex'),
    };
  }
}
