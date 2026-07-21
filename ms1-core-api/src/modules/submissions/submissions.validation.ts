import { z } from 'zod';

export const CreateSubmissionSchema = z.object({
  businessId: z.string().uuid('Invalid business ID format'),
  rawDescription: z.string().min(5, 'Material description must be at least 5 characters'),
  photoRefs: z.array(z.string()).optional(),
  disposalCostPerUnit: z.number().min(0, 'Disposal cost per unit cannot be negative'),
  disposalFrequency: z.string().min(1, 'Disposal frequency is required'),
});
