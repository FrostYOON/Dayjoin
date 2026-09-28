import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createClient,
  isAuthRetryableFetchError,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { z } from 'zod';

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
}

@Injectable()
export class AuthService {
  private readonly client?: SupabaseClient;
  private readonly issuer?: string;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const url = config.get<string>('SUPABASE_URL');
    const key = config.get<string>('SUPABASE_PUBLISHABLE_KEY');
    if (url && key) {
      this.issuer = `${url.replace(/\/$/, '')}/auth/v1`;
      this.client = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: {
          fetch: (input, init) =>
            fetch(input, { ...init, signal: AbortSignal.timeout(5000) }),
        },
      });
    }
  }

  async authenticate(token: string): Promise<AuthenticatedUser> {
    if (!this.client)
      throw new ServiceUnavailableException('Authentication is not configured');
    try {
      // The SDK verifies asymmetric signatures against rotating JWKS; legacy
      // HS256 tokens are verified by the Auth server, never merely decoded.
      const { data, error } = await this.client.auth.getClaims(token);
      if (
        error &&
        (isAuthRetryableFetchError(error) || (error.status ?? 0) >= 500)
      ) {
        throw new ServiceUnavailableException(
          'Authentication is temporarily unavailable',
        );
      }
      if (error || !data) throw new UnauthorizedException();
      const claims = data.claims;
      const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      if (
        claims.iss !== this.issuer ||
        !audience.includes('authenticated') ||
        claims.role !== 'authenticated' ||
        (typeof claims.nbf === 'number' && claims.nbf > Date.now() / 1000) ||
        claims.is_anonymous === true ||
        !z.uuid().safeParse(claims.sub).success ||
        typeof claims.exp !== 'number' ||
        claims.exp <= Date.now() / 1000
      ) {
        throw new UnauthorizedException();
      }
      // Fetch the current user so deleted users and unconfirmed emails cannot
      // pass solely on an older token. Metadata is display-only, never a role.
      const result = await this.client.auth.getUser(token);
      if (
        result.error &&
        (isAuthRetryableFetchError(result.error) ||
          (result.error.status ?? 0) >= 500)
      ) {
        throw new ServiceUnavailableException(
          'Authentication is temporarily unavailable',
        );
      }
      const user = result.data.user;
      if (
        result.error ||
        !user ||
        user.id !== claims.sub ||
        !user.email_confirmed_at ||
        !user.email
      ) {
        throw new UnauthorizedException();
      }
      // Provider metadata is only a display fallback, never authorization data.
      const name = [
        user.user_metadata.display_name,
        user.user_metadata.full_name,
        user.user_metadata.name,
      ].find(
        (value: unknown): value is string =>
          typeof value === 'string' && !!value.trim(),
      );
      return {
        id: user.id,
        email: user.email,
        displayName:
          typeof name === 'string' && name.trim()
            ? name.trim().slice(0, 50)
            : user.email.split('@')[0],
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      // Never expose tokens, provider responses, or user details in errors.
      throw new ServiceUnavailableException(
        'Authentication is temporarily unavailable',
      );
    }
  }
}
