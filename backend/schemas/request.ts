import { z } from 'zod';

export const RequestSchema = z.object({
  query: z.string({
    required_error: 'Query is required',
  }).min(1, 'Query is required'),
  dataSource: z.array(z.enum(['api', 'scrape', 'mock'])).optional(),
});

export type RequestBody = z.infer<typeof RequestSchema>;
