import { z } from 'zod';

export const RequestSchema = z.object({
  query: z.string().min(1, 'Query is required'),
});

export type RequestBody = z.infer<typeof RequestSchema>;
