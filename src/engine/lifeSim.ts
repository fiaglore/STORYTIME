import {
  LIFE_EVENTS,
  bandForAge,
  type AgeBand,
  type AssetId,
  type EventChoice,
  type LifeEvent,
  type StatDelta,
} from "../content/lifeEvents";
import {
  GAME_REPEAT_COOLDOWN_YEARS,
  VARIANTS_BY_CATEGORY,
  pickChores,
  type Chore,
  type ChoreCategory,
  type ChoreGameVariant,
} from "../content/chores";
import { SKILLS, type Skill } from "../content/skills";
import type { ShopItem } from "../content/shop";
import { WEALTH_TIERS, type FaithId, type WealthTierId } from "../content/characterCreation";
import { PRAYER_FLAVORS, randomFlavor } from "../content/prayers";
import { SCHOOLS, schoolsAvailableTo, type School } from "../content/schools";

export type { AssetId };
export { bandForAge };
export type { FaithId, WealthTierId };

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
  // uids this player has blocked — entirely local/client-side (see
  // blockPlayer/unblockPlayer below): hides them from the nearby-players
  // list and from incoming chat messages, without needing their
  // cooperation or a moderation backend.
  blockedUids: string[];
  // ISO date string (YYYY-MM-DD) the player chose at character creation —
  // flavor/display only (birthday events), doesn't change starting age;
  // everybody still starts play at age 0 regardless of this date.
  birthDate: string;
  faith: FaithId;
  // Set once at creation by rollWealthTier and never changed afterwards —
  // the Lagos-slang label for the one-time inheritance below, not a
  // reflection of current naira (a Famous-tier character can still go
  // broke, a Shepeteri one can still get rich).
  wealthTier: WealthTierId;
  inheritance: number;
  // Capped per year same as hustlesThisYear — see pray()/MAX_PRAYERS_PER_YEAR.
  prayersThisYear: number;
  // Per-category chore mastery (0-100), built by passing that category's
  // mini-challenge in resolveChore — see ChoreCategory in content/chores.ts
  // and src/ui/ChoreChallenge.tsx for the three challenge types.
  choreSkills: Record<ChoreCategory, number>;
  // Last mini-game variant played for a given chore id, and at what age —
  // see pickChoreGameVariant below. Keyed by chore id so two different
  // chores in the same category can be mid-cooldown on different games at
  // once.
  choreGameHistory: Record<string, { variant: ChoreGameVariant; age: number }>;
  // Every send-money gift this character has made, kept only long enough
  // to evaluate the rolling send cap — see SEND_WINDOW_YEARS/
  // SEND_CAP_FRACTION/maxSendable below. Pruned to the window on every
  // sendMoney call rather than on ageUp, so it stays correct even across
  // several transfers within the same year.
  sentTransfers: { age: number; amount: number }[];
  // Set once, during the ages-0-10 school-choice window (see
  // AGE_SCHOOL_CHOICE_CUTOFF, chooseSchool, schoolsAvailableTo in
  // content/schools.ts) — null until chosen. ageUp applies the chosen
  // school's ongoing cost/smarts/happiness every year through that
  // window; it's never un-set, so the choice (and its cost) keeps
  // applying for the rest of childhood even if the family's wealth tier
  // wouldn't newly qualify for it today.
  schoolId: string | null;
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

// Sums the quiz answer scores plus a random nudge (the "assigned randomly"
// part of the design ask — this isn't a pure lookup table) and maps the
// result onto the ordered WEALTH_TIERS list to get both the Lagos-slang
// tier label and a concrete one-time inheritance amount within that tier's
// range. Pure/deterministic given its inputs except for the two
// Math.random() calls, kept separate from createCharacter so the mapping
// itself is directly testable.
export function rollWealthTier(answerScores: number[]): { tier: WealthTierId; inheritance: number } {
  const total = answerScores.reduce((sum, s) => sum + s, 0) + randomInt(-2, 4);
  let picked = WEALTH_TIERS[0];
  for (const tier of WEALTH_TIERS) {
    if (total >= tier.minScore) picked = tier;
  }
  return { tier: picked.id, inheritance: randomInt(picked.inheritanceMin, picked.inheritanceMax) };
}

export interface CreateCharacterOptions {
  name: string;
  birthDate: string;
  faith: FaithId;
  wealthTier: WealthTierId;
  inheritance: number;
}

// Everybody starts at the same base stats regardless of wealth tier — only
// the starting naira (the inheritance) and its tier label differ, per the
// design ask that "everybody starts at the same level".
export function createCharacter(opts: CreateCharacterOptions): LifeCharacter {
  const name = opts.name.trim() || "Ngozi";
  const skills: Record<string, number> = {};
  for (const skill of SKILLS) skills[skill.id] = randomInt(0, 10);
  const tierLabel = WEALTH_TIERS.find((t) => t.id === opts.wealthTier)?.label ?? opts.wealthTier;
  return {
    name,
    age: 0,
    job: "none",
    stats: {
      happiness: randomInt(55, 75),
      health: randomInt(70, 90),
      smarts: randomInt(40, 60),
      looks: randomInt(40, 60),
      naira: opts.inheritance,
    },
    alive: true,
    deathCause: null,
    lifespan: randomInt(58, 92),
    log: [
      `${name} is born in Lagos.`,
      `Family tier: ${tierLabel} — inherits ₦${opts.inheritance.toLocaleString()}.`,
    ],
    seenEventIds: [],
    streak: 0,
    assets: [],
    inventory: [],
    skills,
    earnedThisYear: 0,
    spentThisYear: 0,
    hustlesThisYear: 0,
    blockedUids: [],
    birthDate: opts.birthDate,
    faith: opts.faith,
    wealthTier: opts.wealthTier,
    inheritance: opts.inheritance,
    prayersThisYear: 0,
    choreSkills: { labor: 0, errands: 0, finance: 0 },
    choreGameHistory: {},
    sentTransfers: [],
    schoolId: null,
  };
}

// The age range that gets the school-choice screen instead of the normal
// chores/events flow — "infancy - 10 years old" per the design ask.
export const AGE_SCHOOL_CHOICE_CUTOFF = 10;

// Refuses (rather than throws) a school the character's wealth tier can't
// reach, same pattern as every other gated mutator — see
// schoolsAvailableTo in content/schools.ts.
export function chooseSchool(character: LifeCharacter, school: School): LifeCharacter {
  if (!schoolsAvailableTo(character.wealthTier).some((s) => s.id === school.id)) return character;
  return {
    ...character,
    schoolId: school.id,
    log: [...character.log, `Age ${character.age}: Enrolled at ${school.name}.`],
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

// How many chores and life events a year rolls, per age band. Infants (0-2)
// roll nothing, so those years stay a plain Age Up; gameplay starts at age 3
// (the child band). Kids get a lighter load than teens/adults: their pools
// are small, and ten years of five events a year would be mostly repeats.
export const CHORES_PER_YEAR_BY_BAND: Record<AgeBand, number> = {
  infant: 0,
  child: 2,
  teen: 4,
  adult: 4,
};

export const EVENTS_PER_YEAR_BY_BAND: Record<AgeBand, number> = {
  infant: 0,
  child: 2,
  teen: 5,
  adult: 5,
};

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Picks up to `count` DISTINCT events for the character's current band,
// unseen ones first. Distinct matters because seenEventIds only updates when
// an event is resolved, so calling pickEvent() in a loop at the start of the
// year could draw the same event twice before any were played.
export function pickEvents(character: LifeCharacter, count: number): LifeEvent[] {
  const band = bandForAge(character.age);
  const pool = LIFE_EVENTS.filter((e) => e.bands.includes(band));
  const unseen = pool.filter((e) => !character.seenEventIds.includes(e.id));
  const seen = pool.filter((e) => character.seenEventIds.includes(e.id));
  return [...shuffled(unseen), ...shuffled(seen)].slice(0, Math.max(0, count));
}

// Everything a new year asks of the player before Age Up unlocks. One entry
// point so character load, Age Up and tests all agree on when gameplay starts.
export function rollYearWork(character: LifeCharacter): { chores: Chore[]; events: LifeEvent[] } {
  if (!character.alive) return { chores: [], events: [] };
  const band = bandForAge(character.age);
  return {
    chores: pickChores(character, CHORES_PER_YEAR_BY_BAND[band]),
    events: pickEvents(character, EVENTS_PER_YEAR_BY_BAND[band]),
  };
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
  const school = character.schoolId ? SCHOOLS.find((s) => s.id === character.schoolId) : undefined;
  // School costs/benefits only apply through the school-choice age window —
  // schoolId itself is never cleared (see its doc comment), but a
  // character who's aged out of the window stops paying/benefiting.
  const schoolDelta =
    school && nextAge <= AGE_SCHOOL_CHOICE_CUTOFF
      ? { naira: -school.costPerYear, smarts: school.smartsPerYear, happiness: school.happinessPerYear }
      : {};
  const prevNaira = character.stats.naira;
  const stats = applyDelta(character.stats, {
    health: randomInt(-2, 1) - Math.max(0, Math.floor((nextAge - 60) / 10)),
    happiness: randomInt(-1, 1) + (schoolDelta.happiness ?? 0),
    naira: income + (schoolDelta.naira ?? 0),
    smarts: schoolDelta.smarts ?? 0,
  });

  // The school fee (if any) is this year's first spend, same as job
  // income is this year's first earning — trackNaira against a
  // pre-school-fee baseline of (prevNaira + income) so a nonzero fee
  // counts toward spentThisYear exactly like any other naira-moving
  // action does.
  const { spentThisYear } = trackNaira({ earnedThisYear: 0, spentThisYear: 0 }, prevNaira + income, stats.naira);

  const next: LifeCharacter = {
    ...character,
    age: nextAge,
    stats,
    streak: nextStreak(character.streak, stats.health),
    earnedThisYear: income > 0 ? income : 0,
    spentThisYear,
    hustlesThisYear: 0,
    prayersThisYear: 0,
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
  let stats = applyDelta(character.stats, choice.delta);
  let resultLine = choice.result;
  let fatalOverride: string | null = null;

  // "Choosing a risky option could kill or maim them" — rolled once, on
  // top of the choice's normal delta, only for choices that opt into it
  // (see EventRisk in lifeEvents.ts). A fatal roll overrides the choice's
  // own result line with the risk's deathResult; a maiming roll applies an
  // extra harsh delta and appends its own line rather than replacing the
  // choice's result, since the character survives to read both.
  if (choice.risk && Math.random() < choice.risk.chance) {
    if (Math.random() < choice.risk.fatalShare) {
      fatalOverride = choice.risk.deathResult;
    } else {
      stats = applyDelta(stats, choice.risk.maimDelta);
      resultLine = `${resultLine} ${choice.risk.maimResult}`;
    }
  }

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
    log: [...character.log, `Age ${character.age}: ${resultLine}`],
  };
  const cause = fatalOverride ?? checkDeath(next);
  if (cause) {
    next.alive = false;
    next.deathCause = cause;
    next.log = [...next.log, `Age ${character.age}: ${character.name} has passed away. ${cause}`];
  }
  return next;
}

// Flat cost to revive a dead character — a steep, realistic private-
// hospital-and-miracle-worker bill, not a rounding error (see the fuel-
// price-anchored economy note at the top of lifeEvents.ts). Refuses
// (rather than throws) if the character is alive or can't afford it, same
// "refuse rather than throw" shape as every other gated mutator here.
export const REVIVE_COST = 400_000;

export function reviveCharacter(character: LifeCharacter): LifeCharacter {
  if (character.alive || character.stats.naira < REVIVE_COST) return character;
  const prevNaira = character.stats.naira;
  const stats = applyDelta(
    { ...character.stats, naira: character.stats.naira - REVIVE_COST },
    { health: 40 },
  );
  // A death from old age (age >= lifespan) would otherwise immediately
  // re-trigger checkDeath on the very next ageUp, making the revive a
  // no-op that just burns REVIVE_COST for nothing — this was a real bug.
  // Extending the lifespan buys the revived character real extra years,
  // same as the health restore above buys a health-death real recovery.
  const lifespan = character.age >= character.lifespan ? character.age + randomInt(5, 10) : character.lifespan;
  return {
    ...character,
    alive: true,
    deathCause: null,
    stats,
    lifespan,
    ...trackNaira(character, prevNaira, stats.naira),
    log: [...character.log, `Age ${character.age}: A huge hospital bill later, ${character.name} is back.`],
  };
}

// Below this, a maimed-but-alive character can pay for proper treatment —
// the other half of "choosing a risky option ... could cause them money to
// revive" (death isn't the only outcome that costs naira to recover from).
export const CRITICAL_HEALTH_THRESHOLD = 20;
export const TREATMENT_COST = 150_000;

export function treatInjury(character: LifeCharacter): LifeCharacter {
  if (character.stats.health >= CRITICAL_HEALTH_THRESHOLD || character.stats.naira < TREATMENT_COST) {
    return character;
  }
  const prevNaira = character.stats.naira;
  const stats = applyDelta(character.stats, { naira: -TREATMENT_COST, health: 35 });
  return {
    ...character,
    stats,
    ...trackNaira(character, prevNaira, stats.naira),
    log: [...character.log, `Age ${character.age}: Paid for proper treatment and started healing.`],
  };
}

// Applies one daily task (see content/chores.ts) after its mini-challenge
// (ChoreChallenge.tsx) resolves — unlike resolveEvent there's no choice
// index or availability gate, just one delta and a log line, since a
// chore is the "you just have to do this" busywork that gates Age Up
// rather than a dramatic branching moment. passed (default true, for
// callers that skip the challenge) decides whether the chore's full
// delta applies with a chore-category skill gain, or a reduced outcome
// with no gain — failing still clears the chore so a year can never
// stall forever on one unlucky mini-game.
// Picks which of a category's two mini-games (ChoreChallenge.tsx) this
// chore instance gets. If this chore was last played within
// GAME_REPEAT_COOLDOWN_YEARS, the other variant is preferred — "don't
// repeat games in 3 years" per the design ask. A chore with no play
// history yet, or whose last play has aged out of the cooldown, can roll
// either variant freely.
export function pickChoreGameVariant(character: LifeCharacter, chore: Chore): ChoreGameVariant {
  const options = VARIANTS_BY_CATEGORY[chore.category];
  const history = character.choreGameHistory[chore.id];
  const eligible =
    history && character.age - history.age < GAME_REPEAT_COOLDOWN_YEARS
      ? options.filter((v) => v !== history.variant)
      : options;
  const pool = eligible.length > 0 ? eligible : options;
  return pool[randomInt(0, pool.length - 1)];
}

// Records that this chore's mini-game was just played, regardless of
// pass/fail — a failed attempt still "used" that game for the cooldown,
// so a retry reliably offers the other variant rather than the one that
// just failed.
export function recordChoreGamePlayed(
  character: LifeCharacter,
  choreId: string,
  variant: ChoreGameVariant,
): LifeCharacter {
  return {
    ...character,
    choreGameHistory: { ...character.choreGameHistory, [choreId]: { variant, age: character.age } },
  };
}

export function resolveChore(character: LifeCharacter, chore: Chore, passed = true): LifeCharacter {
  const prevNaira = character.stats.naira;
  const delta = passed ? chore.delta : { ...chore.delta, happiness: (chore.delta.happiness ?? 0) - 3 };
  const stats = applyDelta(character.stats, delta);
  const prevLevel = character.choreSkills[chore.category];
  const gain = passed ? randomInt(4, 10) : 0;
  const nextLevel = clampStat(prevLevel + gain);
  const leveledUp = passed && Math.floor(prevLevel / 10) < Math.floor(nextLevel / 10);
  const resultText = passed ? chore.text : `${chore.text} You fumbled it.`;
  return {
    ...character,
    stats,
    ...trackNaira(character, prevNaira, stats.naira),
    choreSkills: { ...character.choreSkills, [chore.category]: nextLevel },
    log: [
      ...character.log,
      `Age ${character.age}: ${resultText}`,
      ...(leveledUp ? [`Age ${character.age}: Getting better at ${chore.category} — level ${nextLevel}.`] : []),
    ],
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

export const MAX_PRAYERS_PER_YEAR = 2;
// "Super randomly" per the design ask — a flat coin flip, no stat or faith
// weighting towards being answered.
const PRAYER_ANSWERED_CHANCE = 0.5;

export interface PrayerResult {
  character: LifeCharacter;
  answered: boolean;
  flavorText: string;
}

// Pray / "speak with your God" — capped per year (MAX_PRAYERS_PER_YEAR)
// same shape as hustle(), so it's a small occasional boost rather than a
// free stat grind. Flavor text comes from content/prayers.ts, keyed by the
// character's chosen faith; the mechanic itself (odds, effect size) is
// identical across every faith. Returns the flavor text alongside the
// character since the UI needs to show which specific line was rolled, not
// just the resulting stats.
export function pray(character: LifeCharacter): PrayerResult {
  if (character.prayersThisYear >= MAX_PRAYERS_PER_YEAR) {
    return { character, answered: false, flavorText: "" };
  }
  const flavor = PRAYER_FLAVORS[character.faith];
  const answered = Math.random() < PRAYER_ANSWERED_CHANCE;
  const next: LifeCharacter = { ...character, prayersThisYear: character.prayersThisYear + 1 };
  if (answered) {
    // One of three small blessings, picked at random, each modest enough
    // not to trivialize the economy (compare hustle()'s 1,200-2,800 range).
    const roll = randomInt(0, 2);
    const prevNaira = character.stats.naira;
    const stats =
      roll === 0
        ? applyDelta(character.stats, { happiness: randomInt(8, 18) })
        : roll === 1
          ? applyDelta(character.stats, { health: randomInt(5, 12) })
          : applyDelta(character.stats, { naira: randomInt(1000, 3500) });
    next.stats = stats;
    Object.assign(next, trackNaira(character, prevNaira, stats.naira));
  } else {
    next.stats = applyDelta(character.stats, { happiness: randomInt(-2, 0) });
  }
  const flavorText = randomFlavor(answered ? flavor.answered : flavor.unanswered);
  next.log = [...character.log, `Age ${character.age}: ${flavorText}`];
  return { character: next, answered, flavorText };
}

// "Nobody can send more than 20% of their net worth every 5 years" — a
// rolling window, not a once-ever cap: a transfer older than
// SEND_WINDOW_YEARS stops counting against the limit. Net worth here is
// just current naira (the only valued asset the engine tracks a number
// for); a character's durable goods in `assets` aren't priced, so they
// don't factor in.
export const SEND_WINDOW_YEARS = 5;
export const SEND_CAP_FRACTION = 0.2;

function sentInWindow(character: LifeCharacter): number {
  return character.sentTransfers
    .filter((t) => character.age - t.age < SEND_WINDOW_YEARS)
    .reduce((sum, t) => sum + t.amount, 0);
}

// How much more this character could send right now without breaching
// the rolling cap — what the UI should clamp its amount input to.
export function maxSendable(character: LifeCharacter): number {
  const cap = Math.floor(character.stats.naira * SEND_CAP_FRACTION);
  return Math.max(0, cap - sentInWindow(character));
}

// Player-to-player money gifts — "send money to help" per the design ask.
// Pure/local, same shape as marry(): the Firestore write/read happens in
// LifeSimSocial.tsx via firebase.ts's sendMoneyTransfer/
// watchIncomingTransfers, these just update the local character. Refuses
// (rather than throws) a non-positive amount, an unaffordable one, or one
// that would breach the rolling send cap above.
export function sendMoney(character: LifeCharacter, amount: number): LifeCharacter {
  if (amount <= 0 || character.stats.naira < amount || amount > maxSendable(character)) return character;
  const prevNaira = character.stats.naira;
  const stats = applyDelta(character.stats, { naira: -amount });
  return {
    ...character,
    stats,
    ...trackNaira(character, prevNaira, stats.naira),
    sentTransfers: [
      ...character.sentTransfers.filter((t) => character.age - t.age < SEND_WINDOW_YEARS),
      { age: character.age, amount },
    ],
    log: [...character.log, `Age ${character.age}: Sent ₦${amount.toLocaleString()} to help someone out.`],
  };
}

export function receiveMoney(character: LifeCharacter, amount: number, fromName: string): LifeCharacter {
  if (amount <= 0) return character;
  const prevNaira = character.stats.naira;
  const stats = applyDelta(character.stats, { naira: amount });
  return {
    ...character,
    stats,
    ...trackNaira(character, prevNaira, stats.naira),
    log: [...character.log, `Age ${character.age}: ${fromName} sent you ₦${amount.toLocaleString()}.`],
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

// Blocking is entirely local — it doesn't need the other player's
// cooperation or any Firestore write of its own. The UI uses it to hide a
// uid from the nearby-players list (lifesimPresence) and from incoming
// chat messages (chats/{chatId}/messages) — see the "Chat" section of
// CLAUDE.md for the full safety-rails picture (this, a profanity filter,
// a send rate limit, and reporting).
export function blockPlayer(character: LifeCharacter, uid: string): LifeCharacter {
  if (character.blockedUids.includes(uid)) return character;
  return { ...character, blockedUids: [...character.blockedUids, uid] };
}

export function unblockPlayer(character: LifeCharacter, uid: string): LifeCharacter {
  return { ...character, blockedUids: character.blockedUids.filter((u) => u !== uid) };
}

// A player can change their mind about their faith after character
// creation — Settings.tsx's Faith section. Flavor-only, same as faith
// being set at creation: it only changes which PRAYER_FLAVORS text pray()
// picks, not the mechanic itself.
export function changeFaith(character: LifeCharacter, faith: FaithId): LifeCharacter {
  if (character.faith === faith) return character;
  return { ...character, faith };
}

// Current shape of a persisted save (localStorage and Firestore's
// users/{uid}.lifeSim both store this). Bump this whenever LifeCharacter
// gains a field that migrateCharacter needs a default for — the version
// number itself isn't branched on anywhere, it's just there for the day a
// real structural migration (not just "fill in a missing field") is
// needed and something has to tell saves apart.
export const SAVE_VERSION = 1;

export interface SaveFile {
  version: number;
  character: LifeCharacter;
}

// Defaults for every field LifeCharacter has gained since the earliest
// saves (back when it was just name/age/job/stats/alive/...) — an old
// save loaded straight as `as LifeCharacter` is missing these, and code
// that reads them (pickChoreGameVariant reading choreGameHistory,
// sendMoney reading sentTransfers, ...) throws on `undefined`. This was a
// real bug: loadSaved did a bare JSON.parse with no version check or
// migration at all.
const CHARACTER_FIELD_DEFAULTS = {
  blockedUids: [] as string[],
  prayersThisYear: 0,
  choreSkills: { labor: 0, errands: 0, finance: 0 } as Record<ChoreCategory, number>,
  choreGameHistory: {} as Record<string, { variant: ChoreGameVariant; age: number }>,
  sentTransfers: [] as { age: number; amount: number }[],
  schoolId: null as string | null,
  birthDate: "" as string,
  faith: "other" as FaithId,
  wealthTier: "middle-class" as WealthTierId,
  inheritance: 0,
};

// Takes whatever was actually in storage — a bare old-shape character
// object, a current-shape one, or a {version, character} wrapper — and
// returns a LifeCharacter with every field present, or null if the input
// isn't recognizable as a character at all (corrupt/unrelated JSON), so
// the caller can fall back to "no save" instead of crashing later deep in
// the engine. Pure and defensive on purpose: every field here needs a
// safe default a player would never notice as "wrong", not just whatever
// makes TypeScript happy.
export function migrateCharacter(raw: unknown): LifeCharacter | null {
  if (!raw || typeof raw !== "object") return null;
  const maybeWrapped = raw as Partial<SaveFile>;
  const candidate =
    "character" in maybeWrapped && maybeWrapped.character && typeof maybeWrapped.character === "object"
      ? maybeWrapped.character
      : raw;
  const obj = candidate as Partial<LifeCharacter>;
  if (typeof obj.name !== "string" || typeof obj.age !== "number" || typeof obj.alive !== "boolean") {
    return null;
  }
  return {
    ...CHARACTER_FIELD_DEFAULTS,
    ...obj,
    stats: obj.stats ?? { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 0 },
    skills: obj.skills ?? {},
    assets: obj.assets ?? [],
    inventory: obj.inventory ?? [],
    seenEventIds: obj.seenEventIds ?? [],
    log: obj.log ?? [],
  } as LifeCharacter;
}
