import type { ChoreCategory } from "../content/chores";
import type { StatDelta } from "../content/lifeEvents";
import type { LifeCharacter } from "./lifeSim";

// Pure rules that make the "soft" stats matter. Nothing here touches state;
// lifeSim.ts calls these from ageUp / hustle / resolveChore / job gating.

// Smarts scale what a job pays: 0 smarts = 80%, 50 = 100%, 100 = 120%.
export function payMultiplier(character: Pick<LifeCharacter, "stats">): number {
  return 0.8 + character.stats.smarts / 250;
}

// Looks scale hustle (street-level) earnings: 90% at 0, 100% at 50, 110% at 100.
// Floor of 0.9 matters: 3 hustles x 1,200 x 0.9 must still clear the adult
// earn requirement (see the hustle regression test).
export function hustleMultiplier(character: Pick<LifeCharacter, "stats">): number {
  return 0.9 + character.stats.looks / 500;
}

// Yearly health effect of mood. Rock-bottom happiness wears the body down;
// a genuinely happy life is slightly protective.
export function moodHealthDrift(character: Pick<LifeCharacter, "stats">): number {
  const h = character.stats.happiness;
  if (h <= 0) return -3;
  if (h < 15) return -1;
  if (h >= 85) return 1;
  return 0;
}

// Minimum smarts before a job is offered, on top of its skill requirement.
export const JOB_MIN_SMARTS: Partial<Record<string, number>> = {
  "civil-servant": 30,
  tech: 40,
};

// Strong labor chore skill keeps you fit.
export function laborFitnessBonus(character: Pick<LifeCharacter, "choreSkills">): number {
  return (character.choreSkills?.labor ?? 0) >= 60 ? 1 : 0;
}

// Real unemployment distress, not a free ride on hustle()/savings: once a
// character has gone a couple of years without a job, every further
// jobless year costs a little happiness — capped so it doesn't spiral
// forever, the same "drift, not punishment" shape as moodHealthDrift.
const UNEMPLOYMENT_STRAIN_THRESHOLD = 2;
export function unemploymentStrain(character: Pick<LifeCharacter, "unemployedStreak">): number {
  return character.unemployedStreak > UNEMPLOYMENT_STRAIN_THRESHOLD ? -2 : 0;
}

// Every 5th consecutive healthy year pays out.
export function streakReward(streak: number): { delta: StatDelta; text: string } | null {
  if (streak > 0 && streak % 5 === 0) {
    return {
      delta: { happiness: 3, health: 2 },
      text: `${streak}-year streak of staying healthy — you feel unstoppable.`,
    };
  }
  return null;
}

// What leveling a chore category actually buys you:
//   labor    >= 30: chores stop costing health
//   errands  >= 30: chores stop costing happiness
//   finance  any:   chores' naira costs shrink by level/2 percent (max 50%)
// Applied to the chore's own delta only; the failed-challenge penalty is added after.
export function applyChoreSkillPerks(
  skills: Record<ChoreCategory, number> | undefined,
  category: ChoreCategory,
  delta: StatDelta,
): StatDelta {
  const level = skills?.[category] ?? 0;
  const out: StatDelta = { ...delta };
  const health = out.health ?? 0;
  const happiness = out.happiness ?? 0;
  const naira = out.naira ?? 0;
  if (category === "labor" && level >= 30 && health < 0) out.health = Math.min(0, health + 1);
  if (category === "errands" && level >= 30 && happiness < 0) out.happiness = Math.min(0, happiness + 1);
  if (category === "finance" && naira < 0) {
    out.naira = -Math.round(Math.abs(naira) * (1 - Math.min(0.5, level / 200)));
  }
  return out;
}

const ZODIAC_STARTS: [number, number, string][] = [
  [1, 20, "Aquarius"],
  [2, 19, "Pisces"],
  [3, 21, "Aries"],
  [4, 20, "Taurus"],
  [5, 21, "Gemini"],
  [6, 21, "Cancer"],
  [7, 23, "Leo"],
  [8, 23, "Virgo"],
  [9, 23, "Libra"],
  [10, 23, "Scorpio"],
  [11, 22, "Sagittarius"],
  [12, 22, "Capricorn"],
];

const ZODIAC_TRAITS: Record<string, string> = {
  Capricorn: "stubborn and driven.",
  Aquarius: "restless and original.",
  Pisces: "dreamy and soft-hearted.",
  Aries: "bold, and in a hurry.",
  Taurus: "steady, and fond of good food.",
  Gemini: "chatty and curious.",
  Cancer: "protective of family.",
  Leo: "proud, and loves an audience.",
  Virgo: "careful with details.",
  Libra: "a born peacemaker.",
  Scorpio: "intense and private.",
  Sagittarius: "adventurous and blunt.",
};

function parseBirthDate(birthDate: string): { month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate ?? "");
  if (!m) return null;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

export function zodiacFor(birthDate: string): string | null {
  const parsed = parseBirthDate(birthDate);
  if (!parsed) return null;
  let sign = "Capricorn";
  for (const [m, d, name] of ZODIAC_STARTS) {
    if (parsed.month > m || (parsed.month === m && parsed.day >= d)) sign = name;
  }
  return sign;
}

const MILESTONE_BIRTHDAYS: Record<number, string> = {
  1: "First birthday — the whole family crowds around the cake.",
  5: "Turned 5 — a big deal in the compound.",
  10: "Double digits — you tell everyone you meet.",
  13: "Turned 13 — officially a teenager.",
  16: "Turned 16 — everyone suddenly has advice.",
  18: "Turned 18 — officially an adult, for better or worse.",
  21: "Turned 21 — the family asks what your plan is.",
  30: "Turned 30 — the aunties start asking questions.",
  40: "Turned 40 — you've earned your opinions.",
  50: "Turned 50 — half a century in Lagos.",
  60: "Turned 60 — elder status, and everyone listens a little more.",
  70: "Turned 70 — the whole family comes to celebrate.",
  80: "Turned 80 — a long road, well travelled.",
};

// Every birthday is a small happiness bump; milestone ones also get a log
// line (ages 1 and 21 mention the zodiac sign). birthDate is the date chosen
// at character creation; an unreadable one just skips the zodiac.
export function birthdayEffects(birthDate: string, age: number): { happiness: number; log: string[] } {
  const text = MILESTONE_BIRTHDAYS[age];
  if (!text) return { happiness: 1, log: [] };
  const sign = age === 1 || age === 21 ? zodiacFor(birthDate) : null;
  const extra = sign ? ` You're a ${sign}: ${ZODIAC_TRAITS[sign]}` : "";
  return { happiness: 1, log: [`Age ${age}: Birthday — ${text}${extra}`] };
}
