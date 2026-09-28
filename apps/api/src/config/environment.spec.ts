import { validateEnvironment } from './environment.js';

describe('environment validation', () => {
  const base = {
    DATABASE_URL: 'postgresql://app:local@localhost:15432/dayjoin',
  };
  it('keeps Redis optional and parses false explicitly', () => {
    expect(
      validateEnvironment({ ...base, REDIS_ENABLED: 'false' }).REDIS_ENABLED,
    ).toBe(false);
    expect(validateEnvironment(base).PORT).toBe(3000);
  });
  it('requires a Redis URL when enabled', () => {
    expect(() =>
      validateEnvironment({ ...base, REDIS_ENABLED: 'true' }),
    ).toThrow('REDIS_URL');
  });
  it.each([
    { PORT: '0' },
    { DATABASE_URL: 'https://invalid.example' },
    { REDIS_ENABLED: 'yes' },
  ])('rejects invalid settings: %j', (settings) => {
    expect(() => validateEnvironment({ ...base, ...settings })).toThrow(
      'Invalid environment fields',
    );
  });
  it.each([
    { SUPABASE_URL: 'https://dayjoin.example' },
    { SUPABASE_PUBLISHABLE_KEY: 'public-key' },
    {
      SUPABASE_URL: 'http://remote.example',
      SUPABASE_PUBLISHABLE_KEY: 'public-key',
    },
    {
      SUPABASE_URL: 'https://user:secret@example.com',
      SUPABASE_PUBLISHABLE_KEY: 'public-key',
    },
  ])('rejects incomplete or unsafe Auth settings: %j', (settings) => {
    expect(() => validateEnvironment({ ...base, ...settings })).toThrow(
      'Invalid environment fields',
    );
  });
  it('does not leak credentials into validation errors', () => {
    expect(() =>
      validateEnvironment({ DATABASE_URL: 'secret-password' }),
    ).toThrow('Invalid environment fields: DATABASE_URL');
  });
});
