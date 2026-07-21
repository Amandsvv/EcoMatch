import { z } from 'zod';

export const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  businessName: z.string().min(1, 'Business name is required'),
  businessType: z.string().min(1, 'Business type is required'),
  address: z.string().min(1, 'Street address is required'),
  phone: z.string().min(1, 'Phone number is required'),
  lat: z.number().optional(),
  lng: z.number().optional(),
  area: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
