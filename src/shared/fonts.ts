import { z } from 'zod';

import { assetCreditSchema } from './asset-credit';

export { assetCreditSchema as fontCreditSchema } from './asset-credit';
export type { AssetCredit as FontCredit } from './asset-credit';
export const fontSchema = assetCreditSchema.extend({
  id: z.uuid(),
  name: z.string().min(1).max(255),
  extension: z.enum(['ttf', 'otf', 'woff', 'woff2']),
});
export type ProjectFont = z.infer<typeof fontSchema>;
