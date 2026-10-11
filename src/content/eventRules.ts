import type { AssetId, LifeEvent } from "./lifeEvents";
import { owns, type OwnedGroup } from "./ownership";
import type { FaithId, JobId, LifeCharacter } from "../engine/lifeSim";

// Who an event is actually for. Events used to fire for everybody, so a
// ₦100M character still argued over a ₦300 keke fare and a non-trader
// still had "your stall" levied. Rules are kept here, keyed by event id,
// rather than inside the long event list; an event with no rule is open to
// everyone. Every key must match a real event id (tested).
export interface EventRule {
  minNaira?: number;
  maxNaira?: number;
  faiths?: FaithId[];
  // Must currently hold one of these jobs.
  jobs?: JobId[];
  // Must have any job at all.
  requiresJob?: boolean;
  requiresAssets?: AssetId[];
  excludesAssets?: AssetId[];
  requiresOwned?: OwnedGroup[];
  excludesOwned?: OwnedGroup[];
  unmarried?: boolean;
  // Must currently be carrying an active loan (LifeCharacter.loanBalance
  // > 0) — the debt-collector events below only fire on someone who
  // actually owes something.
  requiresDebt?: boolean;
  // Must currently owe at least this much — lets debt escalate in flavor
  // as it compounds unpaid (a small balance gets a debt-collector visit;
  // a balance that's grown past this gets real loan-shark pressure).
  minDebt?: number;
}

// The "everyday struggle" threshold, in line with the chores' maxNaira values.
const STRUGGLE = 2_000_000;

export const EVENT_RULES: Record<string, EventRule> = {
  // Transport struggles: gone once you're comfortable or own a car.
  "danfo-dispute": { maxNaira: STRUGGLE, excludesOwned: ["car"] },
  "keke-dispute": { maxNaira: STRUGGLE, excludesOwned: ["car"] },
  "danfo-breakdown": { maxNaira: STRUGGLE, excludesOwned: ["car"] },
  "okada-ban": { maxNaira: STRUGGLE, excludesOwned: ["car"] },
  "go-slow": { maxNaira: 5_000_000, excludesOwned: ["car"] },
  pickpocket: { maxNaira: 3_000_000, excludesOwned: ["car"] },
  "police-checkpoint": { maxNaira: 3_000_000 },
  // You can only be robbed in your car if you have one.
  "armed-robbery": { requiresOwned: ["car"] },
  // Housing.
  "landlord-rent": { excludesOwned: ["home"] },
  "apartment-hunting-fees": { excludesOwned: ["home"] },
  // Work.
  "market-levy": { jobs: ["trader", "hawker"] },
  "promotion-chance": { requiresJob: true },
  "salary-delay": { requiresJob: true },
  // Faith.
  "church-harvest": { faiths: ["christian"] },
  "mosque-giving": { faiths: ["muslim"] },
  "ramadan-fast": { faiths: ["muslim"] },
  "christmas-village-trip": { faiths: ["christian"] },
  "new-yam-festival": { faiths: ["traditional"] },
  "faith-questions": { faiths: ["atheist", "other"] },
  // Don't re-offer what you already own.
  "generator-opportunity": { excludesAssets: ["generator"] },
  "borehole-opportunity": { excludesAssets: ["borehole"] },
  "pos-hustle": { excludesAssets: ["pos-business"] },
  // Only for people who've actually got the thing.
  "pos-float-shortage": { requiresAssets: ["pos-business"] },
  "pos-reversal-dispute": { requiresAssets: ["pos-business"] },
  "logistics-truck-breakdown": { requiresAssets: ["logistics-business"] },
  // Wealth. Thresholds are on current naira, not birth tier, so a fortune
  // won (or lost) mid-life changes what the city throws at you.
  "business-partnership": { minNaira: 3_000_000, excludesAssets: ["logistics-business"] },
  "tax-audit": { minNaira: 5_000_000 },
  "kidnap-scare": { minNaira: 8_000_000 },
  "charity-gala": { minNaira: 4_000_000 },
  "staff-fraud": { minNaira: 2_000_000 },
  "island-party": { minNaira: 10_000_000 },
  // A wedding only happens to someone who isn't already married.
  "wedding-costs": { unmarried: true },
  // Elder-band content: gated on affording an honour, having a home to
  // downsize, or having a job to be asked for advice at.
  "chieftaincy-title": { minNaira: 1_500_000 },
  "downsize-the-house": { requiresOwned: ["home"] },
  "mentor-at-work": { requiresJob: true },
  // Debt has teeth: these only fire on someone actually carrying a loan.
  // A small balance gets a debt-collector visit; one that's grown past
  // minDebt (unpaid and compounding at LOAN_INTEREST_RATE) escalates to
  // real pressure.
  "debt-collector-visit": { requiresDebt: true },
  "loan-shark-pressure": { requiresDebt: true, minDebt: 1_000_000 },
};

export function isEventAllowed(character: LifeCharacter, event: Pick<LifeEvent, "id">): boolean {
  const rule = EVENT_RULES[event.id];
  if (!rule) return true;
  const naira = character.stats.naira;
  if (rule.minNaira != null && naira < rule.minNaira) return false;
  if (rule.maxNaira != null && naira > rule.maxNaira) return false;
  if (rule.faiths && !rule.faiths.includes(character.faith)) return false;
  if (rule.jobs && !rule.jobs.includes(character.job)) return false;
  if (rule.requiresJob && character.job === "none") return false;
  const assets = character.assets ?? [];
  if (rule.requiresAssets && !rule.requiresAssets.every((a) => assets.includes(a))) return false;
  if (rule.excludesAssets && rule.excludesAssets.some((a) => assets.includes(a))) return false;
  if (rule.requiresOwned && !rule.requiresOwned.every((g) => owns(character, g))) return false;
  if (rule.excludesOwned && rule.excludesOwned.some((g) => owns(character, g))) return false;
  if (rule.unmarried && character.spouseUid) return false;
  if (rule.requiresDebt && character.loanBalance <= 0) return false;
  if (rule.minDebt != null && character.loanBalance < rule.minDebt) return false;
  return true;
}
