import { z } from "zod";

// The constant identity shared across all of a user's JobProfiles — edit
// once, applies everywhere (see jobProfile.ts for the per-profile data
// that's allowed to differ between e.g. a "Backend Engineering" profile
// and a "PM roles" profile).
export const PersonSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),

  legalName: z.string(),
  displayName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),

  updatedAt: z.coerce.date(),
});
export type Person = z.infer<typeof PersonSchema>;
