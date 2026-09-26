import { z } from 'zod';

const databaseUrl = z
  .url()
  .refine(
    (value) => /^postgres(ql)?:\/\//.test(value),
    'Expected a PostgreSQL URL',
  );
const schema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: databaseUrl,
    REDIS_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    REDIS_URL: z
      .url()
      .refine((value) => /^rediss?:\/\//.test(value), 'Expected a Redis URL')
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.REDIS_ENABLED && !value.REDIS_URL) {
      context.addIssue({
        code: 'custom',
        path: ['REDIS_URL'],
        message: 'Required when Redis is enabled',
      });
    }
  });

export function validateEnvironment(environment: Record<string, unknown>) {
  const result = schema.safeParse(environment);
  if (!result.success) {
    // Report field names, never connection strings or credentials.
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path.join('.'))),
    ];
    throw new Error(`Invalid environment fields: ${fields.join(', ')}`);
  }
  return result.data;
}
