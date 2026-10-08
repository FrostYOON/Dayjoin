import { z } from 'zod';
const email = z
  .string()
  .trim()
  .toLowerCase()
  .normalize('NFC')
  .pipe(z.email().max(254));
const password = z.string().min(12).max(128);
export const emailSchema = z.strictObject({ email });
export const signInSchema = z.strictObject({
  email,
  password: z.string().min(1).max(128),
});
export const signUpSchema = z.strictObject({
  email,
  password,
  displayName: z.string().trim().min(1).max(50),
});
export const tokenSchema = z.strictObject({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});
export const resetPasswordSchema = tokenSchema.extend({ password });
export type EmailDto = z.infer<typeof emailSchema>;
export type SignInDto = z.infer<typeof signInSchema>;
export type SignUpDto = z.infer<typeof signUpSchema>;
export type TokenDto = z.infer<typeof tokenSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
