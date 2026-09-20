import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    terms: z.boolean().refine((value) => value === true, {
      message: 'You must accept the Terms of Service',
    }),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Passwords do not match',
        path: ['confirmPassword'],
      });
    }
  });

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;

export type PasswordStrength = 'weak' | 'medium' | 'strong';

/** Mirrors registerSchema's password rules: 8+ chars, needs both a letter and a number to be "strong". */
export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return 'weak';

  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return hasLetter && hasNumber ? 'strong' : 'medium';
}
