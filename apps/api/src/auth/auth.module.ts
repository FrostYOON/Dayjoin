import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticationModule } from '@nestjs/authentication';
import { ThrottlerModule } from '@nestjs/throttler';
import { UsersModule } from '../users/users.module.js';
import { DatabaseModule } from '../infrastructure/database/database.module.js';
import { MailModule } from '../infrastructure/mail/mail.module.js';
import { AuthController } from './auth.controller.js';
import { CredentialsService } from './credentials.service.js';
import { SessionAuth } from './session-auth.provider.js';
import { PrismaAuthStore } from './prisma-auth.store.js';
import { VerificationMailer, ResetMailer } from './email.handlers.js';

@Module({
  imports: [
    UsersModule,
    DatabaseModule,
    MailModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    AuthenticationModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const appUrl = config.getOrThrow<string>('APP_URL');
        return {
          session: {
            absoluteTtl: '7d',
            idleTtl: '1d',
            cookie: {
              secure: config.get('NODE_ENV') === 'production',
              sameSite: 'lax',
              path: '/',
            },
            trustedOrigins: [appUrl],
          },
          emailVerification: { url: appUrl + '/auth/verify' },
          passwordReset: { url: appUrl + '/auth/reset' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    CredentialsService,
    SessionAuth,
    PrismaAuthStore,
    VerificationMailer,
    ResetMailer,
  ],
})
export class AuthModule {}
