import { Inject, Injectable } from '@nestjs/common';
import {
  AuthenticationRegistry,
  EmailVerificationHandler,
  PasswordResetHandler,
  type EmailVerificationLink,
  type PasswordResetLink,
} from '@nestjs/authentication';
import { html, Mailer } from '@nestjs/mail';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class VerificationMailer extends EmailVerificationHandler {
  constructor(
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(Mailer) private readonly mailer: Mailer,
    @Inject(AuthenticationRegistry) registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerHandler('emailVerification', this);
  }
  async send(link: EmailVerificationLink) {
    await this.mailer.send({
      to: link.email,
      subject: '[Dayjoin] 이메일을 확인해 주세요',
      html: html`<p>Dayjoin 가입을 위해 이메일을 확인해 주세요.</p>
        <p><a href="${link.url}">이메일 확인</a></p>
        <p>링크는 24시간 동안 한 번 사용할 수 있어요.</p>`,
    });
  }
  markVerified(userId: string, email: string) {
    return this.users.markVerified(userId, email);
  }
}
@Injectable()
export class ResetMailer extends PasswordResetHandler {
  constructor(
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(Mailer) private readonly mailer: Mailer,
    @Inject(AuthenticationRegistry) registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerHandler('passwordReset', this);
  }
  async findUser(email: string) {
    const row = await this.users.findCredentials(email);
    return row
      ? { id: row.id, email: row.email, passwordHash: row.passwordHash }
      : null;
  }
  async send(link: PasswordResetLink) {
    await this.mailer.send({
      to: link.email,
      subject: '[Dayjoin] 비밀번호 변경 안내',
      html: html`<p>새 비밀번호를 설정해 주세요.</p>
        <p><a href="${link.url}">비밀번호 변경</a></p>
        <p>
          링크는 1시간 동안 한 번 사용할 수 있어요. 요청하지 않았다면 이 메일을
          무시해 주세요.
        </p>`,
    });
  }
  updatePassword(userId: string, passwordHash: string) {
    return this.users.updatePassword(userId, passwordHash);
  }
}
