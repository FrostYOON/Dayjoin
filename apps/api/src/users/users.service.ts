import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../infrastructure/database/database.service.js';

@Injectable()
export class UsersService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  private readonly profile = {
    id: true,
    email: true,
    displayName: true,
    emailVerified: true,
  } as const;
  findById(id: string) {
    return this.db.user.findUnique({ where: { id }, select: this.profile });
  }
  findByEmail(email: string) {
    return this.db.user.findUnique({
      where: { email: this.normalize(email) },
      select: this.profile,
    });
  }
  findCredentialsById(id: string) {
    return this.db.user.findUnique({ where: { id } });
  }
  findCredentials(email: string) {
    return this.db.user.findUnique({ where: { email: this.normalize(email) } });
  }
  create(email: string, displayName: string, passwordHash: string) {
    return this.db.user.create({
      data: {
        email: this.normalize(email),
        displayName: displayName.trim(),
        passwordHash,
      },
      select: this.profile,
    });
  }
  async markVerified(id: string, email: string) {
    const { count } = await this.db.user.updateMany({
      where: { id, email: this.normalize(email) },
      data: { emailVerified: true },
    });
    return count > 0;
  }
  async updatePassword(id: string, passwordHash: string) {
    await this.db.user.update({ where: { id }, data: { passwordHash } });
  }
  async upgradePasswordHash(
    id: string,
    previousHash: string,
    passwordHash: string,
  ) {
    const { count } = await this.db.user.updateMany({
      where: { id, passwordHash: previousHash },
      data: { passwordHash },
    });
    return count > 0;
  }
  private normalize(email: string) {
    return email.trim().toLowerCase().normalize('NFC');
  }
}
