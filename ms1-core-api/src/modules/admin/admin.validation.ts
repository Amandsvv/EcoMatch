import { z } from 'zod';

export const CreateHaulerSchema = z.object({
  name: z.string().min(1, 'Hauler name is required'),
  contact: z.string().min(1, 'Contact info is required'),
  serviceArea: z.string().min(1, 'Service area is required'),
});
