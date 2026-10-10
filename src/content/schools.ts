import { WEALTH_TIERS, type WealthTierId } from "./characterCreation";

// Schools for ages 0-10 (infancy through the start of the teen years) —
// "infancy - 10 years old choose a school to attend depending on their
// character level" per the design ask. A character can only choose a
// school whose minTier they can afford to reach (see tierRank/
// schoolsAvailableTo in lifeSim.ts) — a Shepeteri family isn't sending
// their child to an international school, a Famous one isn't limited to
// the free public option either (nothing stops a rich family choosing a
// cheaper school, just the reverse).
export interface School {
  id: string;
  name: string;
  minTier: WealthTierId;
  costPerYear: number;
  smartsPerYear: number;
  happinessPerYear: number;
}

export const SCHOOLS: School[] = [
  { id: "local-public", name: "Local public school", minTier: "shepeteri", costPerYear: 0, smartsPerYear: 2, happinessPerYear: 0 },
  { id: "community-private", name: "Community private school", minTier: "middle-class", costPerYear: 80_000, smartsPerYear: 4, happinessPerYear: 1 },
  { id: "standard-private", name: "Standard private school", minTier: "rich", costPerYear: 250_000, smartsPerYear: 6, happinessPerYear: 1 },
  { id: "elite-academy", name: "Elite private academy", minTier: "stinking-rich", costPerYear: 900_000, smartsPerYear: 9, happinessPerYear: 2 },
  { id: "international-school", name: "International school", minTier: "stupendously-rich", costPerYear: 3_000_000, smartsPerYear: 12, happinessPerYear: 3 },
  { id: "boarding-abroad", name: "Boarding school abroad", minTier: "famous", costPerYear: 12_000_000, smartsPerYear: 15, happinessPerYear: 2 },
];

function tierRank(tier: WealthTierId): number {
  return WEALTH_TIERS.findIndex((t) => t.id === tier);
}

// Schools this character's wealth tier can reach — their own tier or any
// tier below it, same "richer unlocks more, never less" direction as
// every other wealth-gated system in this game.
export function schoolsAvailableTo(wealthTier: WealthTierId): School[] {
  const rank = tierRank(wealthTier);
  return SCHOOLS.filter((s) => tierRank(s.minTier) <= rank);
}
