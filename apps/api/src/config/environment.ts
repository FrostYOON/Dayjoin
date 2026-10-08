import { z } from 'zod';

const origin = z
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      (url.protocol === 'https:' ||
        (url.protocol === 'http:' &&
          ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === '/'
    );
  })
  .transform((value) => new URL(value).origin);
const schema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z.url().refine((value) => /^postgres(ql)?:\/\//.test(value)),
    APP_URL: origin.default('http://127.0.0.1:5173'),
    SMTP_URL: z
      .url()
      .refine((value) => /^smtps?:\/\//.test(value))
      .optional(),
    MAIL_FROM: z.email().default('hello@dayjoin.test'),
    REDIS_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    REDIS_URL: z
      .url()
      .refine((value) => /^rediss?:\/\//.test(value))
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.REDIS_ENABLED && !value.REDIS_URL)
      context.addIssue({
        code: 'custom',
        path: ['REDIS_URL'],
        message: 'Required when Redis is enabled',
      });
    if (value.NODE_ENV === 'production') {
      if (!value.APP_URL.startsWith('https:'))
        context.addIssue({
          code: 'custom',
          path: ['APP_URL'],
          message: 'HTTPS required',
        });
      if (!value.SMTP_URL)
        context.addIssue({
          code: 'custom',
          path: ['SMTP_URL'],
          message: 'SMTP required in production',
        });
    }
  });
export function validateEnvironment(environment: Record<string, unknown>) {
  const result = schema.safeParse(environment);
  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path.join('.'))),
    ];
    throw new Error('Invalid environment fields: ' + fields.join(', '));
  }
  return result.data;
}
