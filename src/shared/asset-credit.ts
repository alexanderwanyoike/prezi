import { z } from 'zod';

export const assetCreditSchema = z.object({
  provenance: z.string().max(2048).optional(),
  license: z.string().max(65536).optional(),
});
export type AssetCredit = z.infer<typeof assetCreditSchema>;
