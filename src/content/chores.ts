import { bandForAge, type AgeBand, type AssetId, type StatDelta } from "./lifeEvents";
import type { LifeCharacter } from "../engine/lifeSim";

// Daily tasks a Lagos Life character has to clear before Age Up is
// available for the year. Unlike LIFE_EVENTS (branching choices, bigger
// stakes), a chore is "you just have to do this" — but it's not a free
// tap either: each one is gated behind a mini-challenge (see
// src/ui/ChoreChallenge.tsx) keyed by category, and clearing it on a
// chosen challenge type builds that category's skill level (see
// LifeCharacter.choreSkills, resolveChore in lifeSim.ts). Failing the
// challenge still clears the chore (so a year can't stall forever on one
// unlucky player) but skips the skill gain and adds a small happiness hit.
export type ChoreCategory = "labor" | "errands" | "finance";

export interface Chore {
  id: string;
  bands: AgeBand[];
  text: string;
  delta: StatDelta;
  category: ChoreCategory;
  // Several of these chores are infrastructure-poverty-coded (queuing to
  // charge a phone implies no power at home) and stop being something a
  // comfortably-off character would still be doing personally — offered
  // only below this naira balance. A character with ₦3.2M saved isn't
  // queuing at a charging kiosk; pickChores filters this out.
  maxNaira?: number;
  // The flip side — a chore that only makes sense once a character has
  // some money (staff to manage, acquaintances hitting them up).
  minNaira?: number;
  // Only offered once the character owns this asset.
  requiresAsset?: AssetId;
  // Never offered once the character owns this asset — you don't queue
  // for water once you own a borehole, or charge your phone at a kiosk
  // once you own a generator.
  excludesAsset?: AssetId;
}

export const CHORES: Chore[] = [
  { id: "fetch-water", bands: ["child", "teen"], text: "Fetch water from the compound tap before school.", delta: { health: -1 }, category: "labor", excludesAsset: "borehole" },
  { id: "sweep-frontage", bands: ["child", "teen"], text: "Sweep the frontage before Mama wakes up.", delta: { happiness: 1 }, category: "labor" },
  { id: "help-pound-yam", bands: ["child", "teen"], text: "Help pound yam for dinner — your arms are dead after.", delta: { health: -1, happiness: 1 }, category: "labor" },
  { id: "homework-check", bands: ["child"], text: "Mama checks your homework before you can go outside.", delta: { smarts: 1 }, category: "errands" },
  { id: "errand-shop", bands: ["child", "teen"], text: "Run to the corner shop for Mama — she's counting the change.", delta: {}, category: "errands" },
  { id: "charge-phone", bands: ["teen", "adult"], text: "Queue at the kiosk to charge your phone.", delta: { naira: -100 }, category: "errands", maxNaira: 500_000, excludesAsset: "generator" },
  { id: "check-family", bands: ["teen", "adult"], text: "Call to check on the family back home.", delta: { happiness: 1 }, category: "errands" },
  { id: "commute", bands: ["adult"], text: "Battle the morning go-slow to get to work.", delta: { happiness: -1 }, category: "labor" },
  { id: "cook-dinner", bands: ["adult"], text: "Cook dinner before NEPA takes the light again.", delta: {}, category: "errands" },
  { id: "bank-queue", bands: ["adult"], text: "Queue at the bank just to withdraw cash.", delta: { happiness: -1 }, category: "finance", maxNaira: 2_000_000 },
  { id: "market-run", bands: ["adult"], text: "Run to the market for the week's foodstuff.", delta: { naira: -2000 }, category: "finance", maxNaira: 2_000_000 },
  { id: "fuel-queue", bands: ["adult"], text: "Queue for fuel at the filling station — na so e be.", delta: { naira: -1400, health: -1 }, category: "labor", maxNaira: 1_000_000 },
  { id: "laundry", bands: ["adult", "teen"], text: "Wash and hang the week's laundry before the rain comes.", delta: { health: -1 }, category: "labor", maxNaira: 1_500_000 },
  { id: "sweep-compound", bands: ["adult"], text: "It's your turn to sweep the shared compound.", delta: {}, category: "labor", maxNaira: 2_000_000 },
  { id: "call-landlord", bands: ["adult"], text: "Dodge the landlord's call about the gutter repair levy.", delta: { happiness: -1 }, category: "errands" },
  { id: "data-bundle", bands: ["teen", "adult"], text: "Your data don finish mid-download — top up again.", delta: { naira: -1000 }, category: "errands" },
  { id: "waste-collector", bands: ["adult"], text: "Pay the waste collector boy before he vexes.", delta: { naira: -500 }, category: "finance" },
  { id: "keke-squeeze", bands: ["adult"], text: "Squeeze into a keke to beat the morning rush.", delta: { naira: -300 }, category: "labor", maxNaira: 800_000 },
  { id: "manage-staff", bands: ["adult"], text: "Settle a dispute between your driver and the gateman.", delta: { happiness: -1 }, category: "finance", minNaira: 1_000_000 },
  { id: "society-call", bands: ["adult"], text: "An \"old friend\" who just heard you're doing well calls to catch up.", delta: { happiness: -1, naira: -5000 }, category: "finance", minNaira: 2_000_000 },
  { id: "generator-maintenance", bands: ["adult"], text: "The generator needs servicing before it packs up on you.", delta: { naira: -2000 }, category: "finance", requiresAsset: "generator" },
  { id: "brt-queue", bands: ["adult"], text: "Join the BRT queue — it's long, but it's the cheapest way to work.", delta: { happiness: -1 }, category: "labor", maxNaira: 1_000_000 },
];

// Picks chores that are actually relevant to this character right now —
// their age band, and whether a given chore's infrastructure assumption
// (no power/water at home, no money to spare, no staff to speak of) still
// holds given their current naira balance and durable goods. A character
// sitting on ₦3.2M isn't queuing at a phone-charging kiosk.
export function pickChores(character: LifeCharacter, count: number): Chore[] {
  const band = bandForAge(character.age);
  const pool = CHORES.filter((c) => isChoreRelevant(c, character, band));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function isChoreRelevant(chore: Chore, character: LifeCharacter, band: AgeBand): boolean {
  if (!chore.bands.includes(band)) return false;
  if (chore.maxNaira != null && character.stats.naira > chore.maxNaira) return false;
  if (chore.minNaira != null && character.stats.naira < chore.minNaira) return false;
  if (chore.requiresAsset && !character.assets.includes(chore.requiresAsset)) return false;
  if (chore.excludesAsset && character.assets.includes(chore.excludesAsset)) return false;
  return true;
}
