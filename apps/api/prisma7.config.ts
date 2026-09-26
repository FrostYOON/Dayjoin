import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // The CLI uses a migration role; application runtime uses DATABASE_URL.
  datasource: { url: process.env['MIGRATION_DATABASE_URL'] },
});
