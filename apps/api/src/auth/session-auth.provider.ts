import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  AuthenticationRegistry,
  SessionCookieProvider,
  type SessionRecord,
} from '@nestjs/authentication';
import { UsersService } from '../users/users.service.js';
import type { UserProfile } from '../users/user.js';

@Injectable()
export class SessionAuth extends SessionCookieProvider<UserProfile> {
  constructor(
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(AuthenticationRegistry) registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerProvider(this);
  }
  protected async validate(session: SessionRecord) {
    const user = await this.users.findCredentialsById(session.userId);
    // A password check that started before a reset may finish after its revocation pass.
    // Bind the session to those credentials so such a late sign-in cannot stay valid.
    if (
      !user ||
      session.metadata?.credentialFingerprint !==
        createHash('sha256').update(user.passwordHash).digest('hex')
    )
      return null;
    const { id, email, displayName, emailVerified } = user;
    return { id, email, displayName, emailVerified };
  }
}
