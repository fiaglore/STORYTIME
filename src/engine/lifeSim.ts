import {
  LIFE_EVENTS,
  bandForAge,
  type AgeBand,
  type AssetId,
  type EventChoice,
  type LifeEvent,
  type StatDelta,
} from "../content/lifeEvents";
import type { Chore } from "../content/chores";
import { SKILLS, type Skill } from "../content/skills";
import type { ShopItem } from "../content/shop";

export type { AssetId };
export { bandForAge };

export interface LifeStats {
  happiness: number;
  health: number;
  smarts: number;
  looks: number;
  naira: number;
}

export type JobId = "none" | "hawker" | "danfo-driver" | "trader" | "tech" | "civil-servant";

export interface Job {
  id: JobId;
  title: string;
  minAge: number;
  payPerYear: number;
  // A minimum skill level (see content/skills.ts) required before this
  // job is even offered — skills gate careers, not just flavor numbers.
  requiresSkill?: { skill: string; level: number };
}

// Realistic annual Lagos income (real Naira, not an abstract unit) — see
// lifeEvents.ts's header comment for the fuel-price anchor this and every
// event cost is calibrated against.
export const JOBS: Job[] = [
  { id: "hawker", title: "Street Hawker", minAge: 18, payPerYear: 350_000 },
  { id: "danfo-driver", title: "Danfo Driver", minAge: 18, payPerYear: 600_000, requiresSkill: { skill: "driving", level: 30 } },
  { id: "trader", title: "Market Trader", minAge: 18, payPerYear: 700_000, requiresSkill: { skill: "trading", level: 20 } },
  { id: "civil-servant", title: "Civil Servant", minAge: 18, payPerYear: 900_000, requiresSkill: { skill: "communication", level: 20 } },
  { id: "tech", title: "Tech Hustler", minAge: 18, payPerYear: 2_200_000, requiresSkill: { skill: "tech", level: 40 } },
];

export interface LifeCharacter {
  name: string;
  age: number;
  job: JobId;
  stats: LifeStats;
  alive: boolean;
  deathCause: string | null;
  lifespan: number;
  log: string[];
  seenEventIds: string[];
  // Consecutive years (or event resolutions) health has stayed at or above
  // the resilience threshold; resets to 0 the moment it dips below.
  streak: number;
  // Durable goods owned (a generator, a POS business, ...) — gates choices
  // tagged requiresAsset in lifeEvents.ts. Granted by resolving a choice
  // tagged grantsAsset.
  assets: AssetId[];
  // Shop items owned (content/shop.ts) — bought once, can't rebuy.
  inventory: string[];
  // Skill id -> level (0-100), gates which jobs are offered (Job's
  // requiresSkill). Trained via trainSkill().
  skills: Record<string, number>;
  // Naira in and out so far this year, reset to (job income, 0) at the
  // start of each new year in ageUp — see AGE_UP_REQUIREMENTS /
  // meetsAgeUpRequirements, which gate Age Up on both being high enough
  // alongside the chores. Tracks the actual change applied (post the
  // naira-floors-at-0 clamp in applyDelta), not the raw delta requested.
  earnedThisYear: number;
  spentThisYear: number;
  // hustle() is capped per year (MAX_HUSTLES_PER_YEAR) so it's a small
  // guaranteed top-up, not a way to trivially grind past the earn
  // requirement.
  hustlesThisYear: number;
  // Another real signed-in player this character is married to — set by
  // both sides independently once a marriage proposal is accepted (see
  // CLAUDE.md's "Marriage" section for why it's not written by either
  // side to the other's save). marry() is local/pure; nothing here talks
  // to Firestore.
  spouseUid?: string;
  spouseName?: string;
}

export interface LifeStage {
  id: string;
  name: string;
  icon: string;
  startAge: number;
  endAge: number;
}

const RESILIENCE_THRESHOLD = 30;

export const LIFE_STAGES: LifeStage[] = [
  { id: "infant", name: "Infant", icon: "👶", startAge: 0, endAge: 2 },
  { id: "child", name: "Child", icon: "🧒", startAge: 3, endAge: 12 },
  { id: "teen", name: "Teen", icon: "🧑‍🎓", startAge: 13, endAge: 17 },
  { id: "young-adult", name: "Young Adult", icon: "🧑", startAge: 18, endAge: 29 },
  { id: "adult", name: "Adult", icon: "🧑‍💼", startAge: 30, endAge: 59 },
  { id: "elder", name: "Elder", icon: "🧓", startAge: 60, endAge: 130 },
];

export function lifeStageForAge(age: number): LifeStage {
  return LIFE_STAGES.find((s) => age >= s.startAge && age <= s.endAge) ?? LIFE_STAGES[LIFE_STAGES.length - 1];
}

function nextStreak(prevStreak: number, health: number): number {
  return health >= RESILIENCE_THRESHOLD ? prevStreak + 1 : 0;
}

const STAT_MIN = 0;
const STAT_MAX = 100;

function clampStat(n: number): number {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, n));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createCharacter(name: string): LifeCharacter {
  const skills: Record<string, number> = {};
  for (const skill of SKILLS) skills[skill.id] = randomInt(0, 10);
  return {
    name: name.trim() || "Ngozi",
    age: 0,
    job: "none",
    stats: {
      happiness: randomInt(55, 75),
      health: randomInt(70, 90),
      smarts: randomInt(40, 60),
      looks: randomInt(40, 60),
      naira: 0,
    },
    alive: true,
    deathCause: null,
    lifespan: randomInt(58, 92),
    log: [`${name.trim() || "Ngozi"} is born in Lagos.`],
    seenEventIds: [],
    streak: 0,
    assets: [],
    inventory: [],
    skills,
    earnedThisYear: 0,
    spentThisYear: 0,
    hustlesThisYear: 0,
  };
}

// Converts an actual naira change (post the floors-at-0 clamp in
// applyDelta, not the raw delta requested) into updated earn/spend
// counters for the year — the single place every naira-moving action
// routes through so Age Up's earn/spend gate sees all of them.
function trackNaira(
  character: Pick<LifeCharacter, "earnedThisYear" | "spentThisYear">,
  prevNaira: number,
  nextNaira: number,
): { earnedThisYear: number; spentThisYear: number } {
  const change = nextNaira - prevNaira;
  if (change > 0) return { earnedThisYear: character.earnedThisYear + change, spentThisYear: character.spentThisYear };
  if (change < 0) return { earnedThisYear: character.earnedThisYear, spentThisYear: character.spentThisYear + Math.abs(change) };
  return { earnedThisYear: character.earnedThisYear, spentThisYear: character.spentThisYear };
}

// How much a character has to earn and spend in a year before Age Up is
// offered, on top of clearing that year's chores — "they must spend and
// earn a certain amount to age up" from the design ask. Zero for
// infant/child: a baby or a young kid has no income or real spending
// power of their own, and none of the child-band chores carry a naira
// cost, so a nonzero requirement there would be an impossible gate, not
// a meaningful one.
export const AGE_UP_REQUIREMENTS: Record<AgeBand, { minEarn: number; minSpend: number }> = {
  infant: { minEarn: 0, minSpend: 0 },
  child: { minEarn: 0, minSpend: 0 },
  teen: { minEarn: 200, minSpend: 200 },
  adult: { minEarn: 3000, minSpend: 3000 },
};

export function meetsAgeUpRequirements(character: LifeCharacter): boolean {
  const req = AGE_UP_REQUIREMENTS[bandForAge(character.age)];
  return character.earnedThisYear >= req.minEarn && character.spentThisYear >= req.minSpend;
}

// Whether a choice should even be offered: a requiresAsset choice needs
// that durable good already owned, a requiresNaira choice needs at least
// that much saved up — the "very difficult challenge to pass" gates (a
// generator, POS capital, full school fees, ...) described in the design.
export function isChoiceAvailable(character: LifeCharacter, choice: EventChoice): boolean {
  if (choice.requiresAsset && !character.assets.includes(choice.requiresAsset)) return false;
  if (choice.requiresNaira != null && character.stats.naira < choice.requiresNaira) return false;
  return true;
}

export function applyDelta(stats: LifeStats, delta: StatDelta): LifeStats {
  return {
    happiness: clampStat(stats.happiness + (delta.happiness ?? 0)),
    health: clampStat(stats.health + (delta.health ?? 0)),
    smarts: clampStat(stats.smarts + (delta.smarts ?? 0)),
    looks: clampStat(stats.looks + (delta.looks ?? 0)),
    naira: Math.max(0, stats.naira + (delta.naira ?? 0)),
  };
}

// Picks one unseen event for the character's current age band, if any
// remain; once all events in a band are exhausted, events there can repeat.
export function pickEvent(character: LifeCharacter): LifeEvent | null {
  const band = bandForAge(character.age);
  const pool = LIFE_EVENTS.filter((e) => e.bands.includes(band));
  if (pool.length === 0) return null;
  const unseen = pool.filter((e) => !character.seenEventIds.includes(e.id));
  const choices = unseen.length > 0 ? unseen : pool;
  return choices[randomInt(0, choices.length - 1)];
}

function jobIncome(job: JobId): number {
  const found = JOBS.find((j) => j.id === job);
  return found ? found.payPerYear : 0;
}

export function checkDeath(character: LifeCharacter): string | null {
  if (character.stats.health <= 0) return "Health failed — the body could only take so much.";
  if (character.age >= character.lifespan) return "Old age, peacefully, surrounded by family.";
  return null;
}

// Advances one year: natural drift, job income, then the death check. Event
// resolution happens separately via applyDelta once the player picks a
// choice, since the UI needs to show the event before stats change. Also
// resets earnedThisYear/spentThisYear/hustlesThisYear for the new year —
// job income (if any) is the new year's first contribution to earned,
// since it just landed.
export function ageUp(character: LifeCharacter): LifeCharacter {
  if (!character.alive) return character;
  const nextAge = character.age + 1;
  const income = jobIncome(character.job);
  const stats = applyDelta(character.stats, {
    health: randomInt(-2, 1) - Math.max(0, Math.floor((nextAge - 60) / 10)),
    happiness: randomInt(-1, 1),
    naira: income,
  });

  const next: LifeCharacter = {
    ...character,
    age: nextAge,
    stats,
    streak: nextStreak(character.streak, stats.health),
    earnedThisYear: income > 0 ? income : 0,
    spentThisYear: 0,
    hustlesThisYear: 0,
  };
  const cause = checkDeath(next);
  if (cause) {
    next.alive = false;
    next.deathCause = cause;
    next.log = [...next.log, `Age ${nextAge}: ${character.name} has passed away. ${cause}`];
  }
  return next;
}

export function resolveEvent(
  character: LifeCharacter,
  event: LifeEvent,
  choiceIndex: number,
): LifeCharacter {
  const choice = event.choices[choiceIndex];
  if (!choice || !isChoiceAvailable(character, choice)) return character;
  const prevNaira = character.stats.naira;
  const stats = applyDelta(character.stats, choice.delta);
  // Streak is a once-a-year resilience check (see ageUp) — an event's
  // immediate stat hit doesn't tick it on its own, or players who hit an
  // event most years would rack up roughly double the "years" they lived.
  const next: LifeCharacter = {
    ...character,
    stats,
    ...trackNaira(character, prevNaira, stats.naira),
    assets:
      choice.grantsAsset && !character.assets.includes(choice.grantsAsset)
        ? [...character.assets, choice.grantsAsset]
        : character.assets,
    seenEventIds: character.seenEventIds.includes(event.id)
      ? character.seenEventIds
      : [...character.seenEventIds, event.id],
    log: [...character.log, `Age ${character.age}: ${choice.result}`],
  };
  const cause = checkDeath(next);
  if (cause) {
    next.alive = false;
    next.deathCause = cause;
    next.log = [...next.log, `Age ${character.age}: ${character.name} has passed away. ${cause}`];
  }
  return next;
}

// Applies one small no-choice daily task (see content/chores.ts) — unlike
// resolveEvent there's no choice index or availability gate, just the one
// delta and a log line, since a chore is the "you just have to do this"
// busywork that gates Age Up rather than a dramatic branching moment.
export function resolveChore(character: LifeCharacter, chore: Chore): LifeCharacter {
  const prevNaira = character.stats.naira;
  const stats = applyDelta(character.stats, chore.delta);
  return {
    ...character,
    stats,
    ...trackNaira(character, prevNaira, stats.naira),
    log: [...character.log, `Age ${character.age}: ${chore.text}`],
  };
}

function isJobAvailable(character: LifeCharacter, job: Job): boolean {
  if (character.age < job.minAge) return false;
  if (job.requiresSkill && (character.skills[job.requiresSkill.skill] ?? 0) < job.requiresSkill.level) return false;
  return true;
}

// Refuses (rather than throws) the same way resolveEvent does for a choice
// gated by isChoiceAvailable — a caller that skips availableJobs' filtering
// still can't assign a job the character doesn't qualify for.
export function takeJob(character: LifeCharacter, job: JobId): LifeCharacter {
  const def = JOBS.find((j) => j.id === job);
  if (!def || !isJobAvailable(character, def)) return character;
  return {
    ...character,
    job,
    log: [...character.log, `Age ${character.age}: Started working as a ${def.title}.`],
  };
}

export function availableJobs(character: LifeCharacter): Job[] {
  return JOBS.filter((j) => isJobAvailable(character, j));
}

// Buys a shop item (content/shop.ts) once — no-op if already owned or
// unaffordable, same "refuse rather than throw" pattern as resolveEvent's
// unavailable-choice guard.
export function buyItem(character: LifeCharacter, item: ShopItem): LifeCharacter {
  if (character.inventory.includes(item.id) || character.stats.naira < item.price) return character;
  const prevNaira = character.stats.naira;
  const stats = applyDelta(character.stats, { ...item.delta, naira: -item.price });
  return {
    ...character,
    stats,
    ...trackNaira(character, prevNaira, stats.naira),
    inventory: [...character.inventory, item.id],
    log: [...character.log, `Age ${character.age}: Bought a ${item.name.toLowerCase()}.`],
  };
}

// Trains one skill point session — a random 5-15 point gain (clamped 0-100
// same as the core stats) for SKILL_TRAIN_COST naira and a little health
// (time and effort spent). No-op if unaffordable.
export function trainSkill(character: LifeCharacter, skill: Skill, cost: number): LifeCharacter {
  if (character.stats.naira < cost) return character;
  const prevNaira = character.stats.naira;
  const gain = randomInt(5, 15);
  const stats = applyDelta(character.stats, { naira: -cost, health: -1 });
  return {
    ...character,
    stats,
    ...trackNaira(character, prevNaira, stats.naira),
    skills: { ...character.skills, [skill.id]: clampStat((character.skills[skill.id] ?? 0) + gain) },
    log: [...character.log, `Age ${character.age}: Practiced ${skill.name.toLowerCase()}.`],
  };
}

export const MAX_HUSTLES_PER_YEAR = 3;

// A small, always-available, capped-per-year way to earn cash on demand —
// exists specifically so the earn requirement in AGE_UP_REQUIREMENTS can
// never soft-lock a character who has no job and didn't happen to roll a
// money-earning event or chore this year. The payout floor matters: at
// MAX_HUSTLES_PER_YEAR uses, even the worst-case roll on every single use
// (3 x 1,200 = 3,600) must still clear the highest band's minEarn (adult's
// 3,000) — this was a real bug (500-1,500 per use could bottom out at
// 1,500 total, genuinely unable to reach 3,000 no matter how many times an
// unemployed adult with no earning event hustled).
export function hustle(character: LifeCharacter): LifeCharacter {
  if (character.hustlesThisYear >= MAX_HUSTLES_PER_YEAR) return character;
  const prevNaira = character.stats.naira;
  const gain = randomInt(1200, 2800);
  const stats = applyDelta(character.stats, { naira: gain, health: -1 });
  return {
    ...character,
    stats,
    ...trackNaira(character, prevNaira, stats.naira),
    hustlesThisYear: character.hustlesThisYear + 1,
    log: [...character.log, `Age ${character.age}: Hustled for a little extra cash.`],
  };
}

// Marries this character to another real player — purely local/pure, see
// CLAUDE.md's "Marriage" section for why Firestore isn't touched here:
// each side sets their own spouseUid once they independently observe the
// proposal they're party to was accepted.
export function marry(character: LifeCharacter, spouseUid: string, spouseName: string): LifeCharacter {
  if (character.spouseUid) return character;
  return {
    ...character,
    spouseUid,
    spouseName,
    stats: applyDelta(character.stats, { happiness: 10 }),
    log: [...character.log, `Age ${character.age}: Married ${spouseName}.`],
  };
}
