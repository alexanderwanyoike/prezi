import { z } from 'zod';

export const fontCreditSchema = z.object({
  provenance: z.string().max(2048).optional(),
  license: z.string().max(65536).optional(),
});
export const fontSchema = fontCreditSchema.extend({
  id: z.uuid(),
  name: z.string().min(1).max(255),
  extension: z.enum(['ttf', 'otf', 'woff', 'woff2']),
});
export type ProjectFont = z.infer<typeof fontSchema>;
export type FontCredit = z.infer<typeof fontCreditSchema>;
