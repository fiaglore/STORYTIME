import { describe, expect, it } from "vitest";
import {
  CHORES_PER_YEAR_BY_BAND,
  EVENTS_PER_YEAR_BY_BAND,
  ageUp,
  isChoiceAvailable,
  pickEvents,
  rollYearWork,
  type LifeCharacter,
} from "../src/engine/lifeSim";
import { LIFE_EVENTS } from "../src/content/lifeEvents";

function baseCharacter(overrides: Partial<LifeCharacter> = {}): LifeCharacter {
  return {
    name: "Test",
    age: 5,
    job: "none",
    stats: { happiness: 50, health: 80, smarts: 50, looks: 50, naira: 10 },
    alive: true,
    deathCause: null,
    lifespan: 80,
    log: [],
    seenEventIds: [],
    streak: 0,
    assets: [],
    inventory: [],
    skills: {},
    earnedThisYear: 0,
    spentThisYear: 0,
    hustlesThisYear: 0,
    blockedUids: [],
    birthDate: "2000-01-01",
    faith: "christian",
    wealthTier: "middle-class",
    inheritance: 0,
    prayersThisYear: 0,
    choreSkills: { labor: 0, errands: 0, finance: 0 },
    sentTransfers: [],
    schoolId: null,
    choreGameHistory: {},
    ...overrides,
  };
}

const childPool = LIFE_EVENTS.filter((e) => e.bands.includes("child"));

describe("childhood gameplay (ages 3-10)", () => {
  it("infants (0-2) roll no chores or events, so those years stay a plain Age Up", () => {
    for (const age of [0, 1, 2]) {
      const work = rollYearWork(baseCharacter({ age }));
      expect(work.chores).toEqual([]);
      expect(work.events).toEqual([]);
    }
  });

  it("gameplay starts at age 3: a child rolls the child-band number of chores and events", () => {
    for (const age of [3, 6, 10]) {
      const work = rollYearWork(baseCharacter({ age }));
      expect(work.chores).toHaveLength(CHORES_PER_YEAR_BY_BAND.child);
      expect(work.events).toHaveLength(EVENTS_PER_YEAR_BY_BAND.child);
    }
  });

  it("a school-age child (<= 10) gets the same work as any other child, not an empty year", () => {
    const work = rollYearWork(baseCharacter({ age: 7, schoolId: "local-public" }));
    expect(work.events.every((e) => e.bands.includes("child"))).toBe(true);
    expect(work.chores.length).toBeGreaterThan(0);
  });

  it("aging from 2 to 3 lands in a year that actually has work", () => {
    const aged = ageUp(baseCharacter({ age: 2 }));
    expect(aged.age).toBe(3);
    const work = rollYearWork(aged);
    expect(work.events.length).toBeGreaterThan(0);
    expect(work.chores.length).toBeGreaterThan(0);
  });

  it("a dead character rolls nothing", () => {
    const work = rollYearWork(baseCharacter({ alive: false }));
    expect(work.chores).toEqual([]);
    expect(work.events).toEqual([]);
  });

  it("child pool is big enough that a child doesn't see repeats for several years", () => {
    expect(childPool.length).toBeGreaterThanOrEqual(EVENTS_PER_YEAR_BY_BAND.child * 4);
  });

  it("every child event keeps at least one choice available with no money and no assets", () => {
    const broke = baseCharacter({ stats: { happiness: 50, health: 50, smarts: 50, looks: 50, naira: 0 } });
    for (const event of childPool) {
      expect(event.choices.some((c) => isChoiceAvailable(broke, c))).toBe(true);
    }
  });
});

describe("pickEvents", () => {
  it("never returns the same event twice in one batch", () => {
    const c = baseCharacter({ age: 5 });
    for (let i = 0; i < 100; i++) {
      const ids = pickEvents(c, 5).map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("prefers unseen events over seen ones", () => {
    const keep = childPool.slice(0, 2).map((e) => e.id);
    const seenEventIds = childPool.filter((e) => !keep.includes(e.id)).map((e) => e.id);
    const c = baseCharacter({ age: 5, seenEventIds });
    for (let i = 0; i < 30; i++) {
      const ids = pickEvents(c, 2).map((e) => e.id).sort();
      expect(ids).toEqual([...keep].sort());
    }
  });

  it("falls back to seen events once the unseen ones run out", () => {
    const c = baseCharacter({ age: 5, seenEventIds: childPool.map((e) => e.id) });
    expect(pickEvents(c, 2)).toHaveLength(2);
  });

  it("never returns more events than the band has, and returns [] for infants", () => {
    expect(pickEvents(baseCharacter({ age: 5 }), 999)).toHaveLength(childPool.length);
    expect(pickEvents(baseCharacter({ age: 1 }), 5)).toEqual([]);
  });
});
