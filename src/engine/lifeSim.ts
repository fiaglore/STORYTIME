import { LIFE_EVENTS, bandForAge, type LifeEvent, type StatDelta } from "../content/lifeEvents";

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
}

export const JOBS: Job[] = [
  { id: "hawker", title: "Street Hawker", minAge: 18, payPerYear: 6 },
  { id: "danfo-driver", title: "Danfo Driver", minAge: 18, payPerYear: 9 },
  { id: "trader", title: "Market Trader", minAge: 18, payPerYear: 10 },
  { id: "civil-servant", title: "Civil Servant", minAge: 18, payPerYear: 12 },
  { id: "tech", title: "Tech Hustler", minAge: 18, payPerYear: 16 },
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
  };
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
// choice, since the UI needs to show the event before stats change.
export function ageUp(character: LifeCharacter): LifeCharacter {
  if (!character.alive) return character;
  const nextAge = character.age + 1;
  let stats = applyDelta(character.stats, {
    health: randomInt(-2, 1) - Math.max(0, Math.floor((nextAge - 60) / 10)),
    happiness: randomInt(-1, 1),
    naira: jobIncome(character.job),
  });

  const next: LifeCharacter = {
    ...character,
    age: nextAge,
    stats,
    streak: nextStreak(character.streak, stats.health),
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
  if (!choice) return character;
  const stats = applyDelta(character.stats, choice.delta);
  // Streak is a once-a-year resilience check (see ageUp) — an event's
  // immediate stat hit doesn't tick it on its own, or players who hit an
  // event most years would rack up roughly double the "years" they lived.
  const next: LifeCharacter = {
    ...character,
    stats,
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

export function takeJob(character: LifeCharacter, job: JobId): LifeCharacter {
  const def = JOBS.find((j) => j.id === job);
  if (!def || character.age < def.minAge) return character;
  return {
    ...character,
    job,
    log: [...character.log, `Age ${character.age}: Started working as a ${def.title}.`],
  };
}

export function availableJobs(character: LifeCharacter): Job[] {
  return JOBS.filter((j) => character.age >= j.minAge);
}
