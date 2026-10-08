import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { DatabaseModule } from '../infrastructure/database/database.module.js';

@Module({
  imports: [DatabaseModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
