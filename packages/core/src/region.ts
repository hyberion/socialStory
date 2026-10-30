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
    // Oct 29: after four seating rules the model still put the booster on the
    // middle divider and dropped the passenger seat. So we never draw inside.
    "Never draw the inside of a car, bus or other vehicle. Show vehicles only from the outside: people walking to it, standing beside it, or the vehicle on the road or parked.",
    `Cars drive on the ${region.drivesOn} side of the road. The steering wheel is on the ${driverSide.toLowerCase()} side of the car (the driver's door is on the ${driverSide} side).`,
    "Children get into the back seat of a car, never the front.",
  ];
}
