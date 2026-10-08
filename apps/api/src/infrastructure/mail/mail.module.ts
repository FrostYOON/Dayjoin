import { mkdirSync, chmodSync } from 'node:fs';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FileMailTransport,
  MailModule as NestMailModule,
  SmtpTransport,
} from '@nestjs/mail';

@Module({
  imports: [
    NestMailModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('SMTP_URL');
        if (!url) {
          mkdirSync('var/mail', { recursive: true, mode: 0o700 });
          chmodSync('var/mail', 0o700);
        }
        return {
          from: config.getOrThrow<string>('MAIL_FROM'),
          transport: url
            ? new SmtpTransport({
                url,
                timeouts: {
                  connect: '5s',
                  greeting: '5s',
                  command: '5s',
                  data: '10s',
                },
              })
            : new FileMailTransport({ directory: 'var/mail', log: false }),
          retry: false as const,
        };
      },
    }),
  ],
})
export class MailModule {}
