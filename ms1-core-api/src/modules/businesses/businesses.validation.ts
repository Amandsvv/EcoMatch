import { z } from 'zod';

export const UpdateBusinessProfileSchema = z.object({
  name: z.string().min(1, 'Business name cannot be empty').optional(),
  type: z.string().min(1, 'Business type cannot be empty').optional(),
  address: z.string().min(1, 'Address cannot be empty').optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  phone: z.string().min(1, 'Phone cannot be empty').optional(),
});
