import { z } from 'zod';
import { resultSchema } from './result';

export const mcpStatusSchema = resultSchema(z.object({ url: z.url() }));
