import { spawnSync } from 'node:child_process';
const sql = "SELECT 'CREATE DATABASE dayjoin_auth_test OWNER dayjoin_migrator' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dayjoin_auth_test');";
const result = spawnSync('docker', ['compose', 'exec', '-T', 'postgres', 'psql', '-U', 'dayjoin_local_admin', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
  input: sql + '\n\\gexec\n', stdio: ['pipe', 'inherit', 'inherit'],
});
if (result.status !== 0) process.exit(result.status ?? 1);
const migrated = spawnSync('pnpm', ['db:migrate:deploy'], {
  env: { ...process.env, MIGRATION_DATABASE_URL: 'postgresql://dayjoin_migrator:local_migration_only@127.0.0.1:15432/dayjoin_auth_test' },
  stdio: 'inherit',
});
process.exit(migrated.status ?? 1);
