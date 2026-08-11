import { z } from "zod";
import { VettingResultSchema } from "./vettingResult.js";

export const ApplicationDraftStatusSchema = z.enum([
  "reviewed",
  "submitted",
  "skipped",
]);
export type ApplicationDraftStatus = z.infer<
  typeof ApplicationDraftStatusSchema
>;

// Autofill mapping: form field key -> profile field key it was filled from.
export const AutofillFieldMapSchema = z.record(z.string(), z.string());
export type AutofillFieldMap = z.infer<typeof AutofillFieldMapSchema>;

// User's manual overrides: form field key -> the value the user typed instead.
export const UserEditsSchema = z.record(z.string(), z.string());
export type UserEdits = z.infer<typeof UserEditsSchema>;

export const ApplicationDraftSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  jobId: z.string().uuid(), // references jobs_seen, not shared as its own schema
  criteriaId: z.string().uuid(), // which search profile it was scored against

  vettingSnapshot: VettingResultSchema,
  autofillFieldMap: AutofillFieldMapSchema.default({}),
  userEdits: UserEditsSchema.default({}),
  status: ApplicationDraftStatusSchema.default("reviewed"),

  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ApplicationDraft = z.infer<typeof ApplicationDraftSchema>;
