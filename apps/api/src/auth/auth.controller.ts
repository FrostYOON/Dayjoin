import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  Authenticate,
  CurrentUser,
  EmailVerificationService,
  PasswordResetService,
  Public,
  SignInService,
} from '@nestjs/authentication';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UsersService } from '../users/users.service.js';
import type { UserProfile } from '../users/user.js';
import { CredentialsService } from './credentials.service.js';
import {
  emailSchema,
  signInSchema,
  signUpSchema,
  tokenSchema,
  resetPasswordSchema,
  type EmailDto,
  type SignInDto,
  type SignUpDto,
  type TokenDto,
  type ResetPasswordDto,
} from './auth.dto.js';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    @Inject(CredentialsService)
    private readonly credentials: CredentialsService,
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(SignInService) private readonly signIn: SignInService,
    @Inject(EmailVerificationService)
    private readonly verification: EmailVerificationService,
    @Inject(PasswordResetService) private readonly reset: PasswordResetService,
  ) {}

  @Public()
  @Get('settings')
  settings() {
    return { providers: { google: false, apple: false } };
  }

  @Public()
  @Post('sign-up')
  @HttpCode(202)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async signUp(@Body({ schema: signUpSchema }) body: SignUpDto) {
    const user = await this.credentials.register(
      body.email,
      body.password,
      body.displayName,
    );
    await this.sendVerification(user);
    return { message: 'Check your email' };
  }

  @Public()
  @Post('sign-in')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body({ schema: signInSchema }) body: SignInDto) {
    const user = await this.credentials.verify(body.email, body.password);
    if (!user) throw new UnauthorizedException('Invalid email or password');
    if (!user.emailVerified)
      throw new BadRequestException('Email verification required');
    const { credentialFingerprint, ...profile } = user;
    await this.signIn.signIn(user.id, {
      method: 'password',
      metadata: { credentialFingerprint },
    });
    return profile;
  }

  @Get('me')
  @Authenticate({ verifiedEmail: true })
  me(@CurrentUser() user: UserProfile) {
    return user;
  }

  @Public()
  @Post('email/verify')
  @HttpCode(200)
  async verifyEmail(@Body({ schema: tokenSchema }) body: TokenDto) {
    if (!(await this.verification.verify(body.token)))
      throw new BadRequestException('Invalid or expired link');
    return { message: 'Email verified' };
  }

  @Public()
  @Post('email/verification')
  @HttpCode(202)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async resend(@Body({ schema: emailSchema }) body: EmailDto) {
    const user = await this.users.findByEmail(body.email);
    if (user && !user.emailVerified) await this.sendVerification(user);
    return { message: 'Check your email' };
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(202)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  forgot(@Body({ schema: emailSchema }) body: EmailDto) {
    this.reset.request(body.email);
    return { message: 'Check your email' };
  }

  @Public()
  @Post('password/reset')
  @HttpCode(200)
  async resetPassword(
    @Body({ schema: resetPasswordSchema }) body: ResetPasswordDto,
  ) {
    if (!(await this.reset.reset(body.token, body.password)))
      throw new BadRequestException('Invalid or expired link');
    return { message: 'Password changed' };
  }

  @Public()
  @Post('sign-out')
  @HttpCode(200)
  async logout() {
    await this.signIn.signOut();
    return { message: 'Signed out' };
  }

  private async sendVerification(user: UserProfile) {
    try {
      await this.verification.send(user);
    } catch {
      throw new ServiceUnavailableException(
        'Email delivery unavailable; request a new verification email',
      );
    }
  }
}
