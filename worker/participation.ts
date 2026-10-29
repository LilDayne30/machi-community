import { z } from "zod";
import { participationError } from "../src/lib/participation";

const year = z.number().int().nullable();
export const participationSchema = z
  .object({
    roles: z
      .array(z.enum(["explorer", "alumni", "local"]))
      .min(1)
      .max(3),
    stage: z.enum(["curious", "comparing", "preparing", "abroad", "returned"]),
    destinations: z.array(z.string().max(80)).max(5),
    questions: z.array(z.string().max(40)).max(6),
    experiences: z
      .array(
        z
          .object({
            regionId: z.string().max(80),
            level: z.enum(["high_school", "university", "language", "other"]),
            format: z.enum(["exchange", "direct", "short", "other"]),
            startYear: year,
            endYear: year,
            months: z.number().int().nullable(),
            topics: z.array(z.string().max(40)).max(6),
          })
          .strict(),
      )
      .max(5),
    local: z
      .object({
        kind: z.enum(["student", "studying_abroad", "resident"]),
        regionId: z.string().max(80),
        languages: z.string().trim().max(120),
        topics: z.string().trim().max(240),
      })
      .strict(),
  })
  .strict()
  .superRefine((p, ctx) => {
    const message = participationError(p);
    if (message) ctx.addIssue({ code: "custom", message });
  });
