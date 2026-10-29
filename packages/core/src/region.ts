import { z } from "zod";

/**
 * Where the user lives, so pictures match the child's real world.
 * A US child should see the driver on the left; a UK child on the right.
 */
export const Region = z.object({
  /** ISO country code, e.g. "US", "GB", "AU". */
  country: z.string().length(2).default("US"),
  /** Which side of the road cars drive on. */
  drivesOn: z.enum(["right", "left"]).default("right"),
});
export type Region = z.infer<typeof Region>;

/** Settings that belong to the user (the adult), not the player. */
export const UserSettings = z.object({
  region: Region.default({}),
});
export type UserSettings = z.infer<typeof UserSettings>;

/** Real-world details every picture must respect. Sent with every page prompt. */
export function worldRulesFor(region: Region): string[] {
  const driverSide = region.drivesOn === "right" ? "LEFT" : "RIGHT";
  return [
    `Cars drive on the ${region.drivesOn} side of the road. In any car, the driver sits on the ${driverSide} side with the steering wheel on the ${driverSide.toLowerCase()}.`,
    "Children ride in the back seat, in a car seat or booster seat. Everyone in a car wears a fastened seatbelt.",
  ];
}
