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

// Secondary schools for ages 11-17 (SECONDARY_SCHOOL_START_AGE/
// SECONDARY_SCHOOL_END_AGE in lifeSim.ts) — a second, separate school
// choice alongside the primary one, same School shape, same wealth-gate
// direction, just priced for secondary-level fees (consistently higher
// than the matching primary-school tier, same as real Lagos school fees).
export const SECONDARY_SCHOOLS: School[] = [
  { id: "community-secondary", name: "Community secondary school", minTier: "shepeteri", costPerYear: 20_000, smartsPerYear: 3, happinessPerYear: 0 },
  { id: "federal-unity-college", name: "Federal unity college", minTier: "middle-class", costPerYear: 100_000, smartsPerYear: 5, happinessPerYear: 1 },
  { id: "standard-private-secondary", name: "Standard private secondary school", minTier: "rich", costPerYear: 450_000, smartsPerYear: 7, happinessPerYear: 1 },
  { id: "elite-secondary-academy", name: "Elite secondary academy", minTier: "stinking-rich", costPerYear: 1_500_000, smartsPerYear: 10, happinessPerYear: 2 },
  { id: "international-secondary", name: "International secondary school", minTier: "stupendously-rich", costPerYear: 4_500_000, smartsPerYear: 13, happinessPerYear: 3 },
  { id: "boarding-abroad-secondary", name: "Boarding school abroad", minTier: "famous", costPerYear: 15_000_000, smartsPerYear: 16, happinessPerYear: 2 },
];

export function secondarySchoolsAvailableTo(wealthTier: WealthTierId): School[] {
  const rank = tierRank(wealthTier);
  return SECONDARY_SCHOOLS.filter((s) => tierRank(s.minTier) <= rank);
}

// Tertiary institutions, enrolled into after taking JAMB (see takeJAMB/
// JAMB_UNIVERSITY_CUTOFF/JAMB_POLY_CUTOFF in lifeSim.ts) — gated on both
// wealth tier (same direction as every other wealth gate) AND a minimum
// JAMB score, since money alone doesn't buy admission. durationYears is
// how many years of ageUp progress (see rollUniversityProgress) before
// graduation; ASUU strikes (ASUU_STRIKE_CHANCE) can stall a year without
// ending it early.
export interface University {
  id: string;
  name: string;
  minTier: WealthTierId;
  minJambScore: number;
  costPerYear: number;
  smartsPerYear: number;
  happinessPerYear: number;
  durationYears: number;
}

export const UNIVERSITIES: University[] = [
  { id: "polytechnic", name: "State Polytechnic", minTier: "shepeteri", minJambScore: 140, costPerYear: 80_000, smartsPerYear: 5, happinessPerYear: 0, durationYears: 3 },
  { id: "federal-university", name: "Federal University", minTier: "shepeteri", minJambScore: 200, costPerYear: 120_000, smartsPerYear: 8, happinessPerYear: 1, durationYears: 4 },
  { id: "state-university", name: "State University", minTier: "middle-class", minJambScore: 180, costPerYear: 150_000, smartsPerYear: 7, happinessPerYear: 1, durationYears: 4 },
  { id: "private-university", name: "Private University", minTier: "rich", minJambScore: 180, costPerYear: 1_200_000, smartsPerYear: 9, happinessPerYear: 2, durationYears: 4 },
  { id: "elite-private-university", name: "Elite Private University", minTier: "stinking-rich", minJambScore: 220, costPerYear: 3_000_000, smartsPerYear: 11, happinessPerYear: 2, durationYears: 4 },
  { id: "university-abroad", name: "University Abroad", minTier: "famous", minJambScore: 240, costPerYear: 18_000_000, smartsPerYear: 14, happinessPerYear: 3, durationYears: 4 },
];

export function universitiesAvailableTo(wealthTier: WealthTierId, jambScore: number): University[] {
  const rank = tierRank(wealthTier);
  return UNIVERSITIES.filter((u) => tierRank(u.minTier) <= rank && jambScore >= u.minJambScore);
}
