// Frontend auth validation using Zod
// Zod is served from /vendor/zod/index.mjs via server.js explicit route
import { z } from '/vendor/zod/index.mjs';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email').max(254, 'Email is too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
});

export const signupSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be at most 32 characters')
    .regex(/^[a-z0-9_.-]+$/i, 'Allowed characters: letters, numbers, _ . -'),
  email: z.string().email('Enter a valid email').max(254, 'Email is too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
  confirm: z.string().min(8, 'Confirm your password'),
}).refine((data) => data.password === data.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});
