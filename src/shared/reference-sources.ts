import { z } from 'zod';
import { resultSchema } from './result';

export const referenceSourcesSchema = z
  .record(
    z.string().regex(/^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:tsx?|css|json)$/),
    z.string().max(250000),
  )
  .refine(
    (sources) =>
      Object.keys(sources).length <= 128 &&
      Object.values(sources).reduce((sum, source) => sum + source.length, 0) <= 1000000,
  );

export const sourceCatalogSchema = z.object({ id: z.uuid(), files: referenceSourcesSchema });
export const sourceCatalogResultSchema = resultSchema(sourceCatalogSchema);
export type SourceCatalog = z.infer<typeof sourceCatalogSchema>;
