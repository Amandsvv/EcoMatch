import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const SignupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  businessName: z.string().min(1, 'Business name is required'),
  businessType: z.string().min(1, 'Please select a business type'),
  address: z.string().min(1, 'Street address is required'),
  area: z.string().min(1, 'Area / Locality is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().min(1, 'Pincode / ZIP Code is required'),
  phone: z.string().min(1, 'Phone number is required'),
});

export const SubmitSurplusSchema = z.object({
  description: z.string().min(5, 'Material description must be at least 5 characters'),
  cost: z.coerce.number().min(0, 'Disposal cost cannot be negative'),
  frequency: z.string().min(1, 'Please select a disposal frequency'),
});
