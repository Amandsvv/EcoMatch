import { z } from 'zod';

export const SubmitEvidenceSchema = z.object({
  evidenceType: z.string().min(1, 'Evidence type is required'),
  evidenceUrl: z.string().optional().or(z.literal('')),
});
