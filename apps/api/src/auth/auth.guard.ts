import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, type AuthenticatedUser } from './auth.service.js';

export type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const match = /^Bearer ([^\s,]+)$/i.exec(
      request.headers.authorization ?? '',
    );
    if (!match || match[1].length > 16384) throw new UnauthorizedException();
    request.user = await this.auth.authenticate(match[1]);
    return true;
  }
}
