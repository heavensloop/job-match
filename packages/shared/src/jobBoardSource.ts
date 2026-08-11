import { z } from "zod";

export const CrawlCadenceSchema = z.enum(["hourly", "daily", "weekly"]);
export type CrawlCadence = z.infer<typeof CrawlCadenceSchema>;

export const JobBoardSourceSchema = z.object({
  id: z.string().uuid(),
  criteriaId: z.string().uuid(),

  name: z.string(),
  baseUrl: z.string().url(),
  // Query-string template applied to baseUrl at crawl time, encodes the
  // filters (remote/pay/location) that belong to this criteria set.
  queryTemplate: z.string(),

  cadence: CrawlCadenceSchema.default("daily"),
  lastFetchedAt: z.coerce.date().nullable().default(null),
  enabled: z.boolean().default(true),
});
export type JobBoardSource = z.infer<typeof JobBoardSourceSchema>;
